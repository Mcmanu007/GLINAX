import logging
from uuid import UUID

from django.conf import settings
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView

from openai import OpenAI

from .models import Chat, ChatHistory, ChatCollaborator
from .serializers import (
    ChatSerializer,
    ChatHistorySerializer,
    ChatListSerializer,
    ChatMessageSerializer,
    ChatCollaboratorSerializer,
)
from django.core.files.base import ContentFile
from.models import AudioFile, TextToSpeech
from .utils import get_client_ip, generate_chat_title_from_openai

from g_auth.models import GuestChatTracker, GuestIPTracker

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class AddCollaboratorAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        user_ids = request.data.get("user_ids", [])
        access_level = request.data.get("access_level", "view")

        if not isinstance(user_ids, list) or not user_ids:
            return Response({"error": "user_ids must be a non-empty list."}, status=400)

        # Get chat object first
        chat = get_object_or_404(Chat, id=chat_id)

        # ✅ Check ownership before anything else
        if chat.user != request.user:
            return Response({"error": "Only the owner can add collaborators."}, status=403)

        added = []

        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                if user == request.user:
                    continue  # Skip adding self

                existing = ChatCollaborator.objects.filter(chat=chat, collaborator=user).first()

                if existing:
                    if existing.access_level != access_level:
                        existing.access_level = access_level
                        existing.save()
                    continue  # Already added
                else:
                    ChatCollaborator.objects.create(
                        chat=chat,
                        collaborator=user,
                        access_level=access_level,
                        added_by=request.user,
                        is_approved=False
                    )
                    added.append({"id": user.id, "username": user.username})

            except User.DoesNotExist:
                continue  # Ignore invalid IDs
        print(f"OWNER: {chat.user.username}, REQUESTING: {request.user.username}")

        return Response({
            "message": f"{len(added)} collaborators added.",
            "collaborators": added
        }, status=200)

class RemoveCollaboratorAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        username = request.data.get("username")
        if not username:
            return Response({"error": "Username is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id)
            collaborator = User.objects.get(username=username)
            collab = ChatCollaborator.objects.get(chat=chat, collaborator=collaborator)
        except (Chat.DoesNotExist, User.DoesNotExist, ChatCollaborator.DoesNotExist):
            return Response({"error": "Collaboration not found."}, status=404)

        if request.user != chat.user and request.user != collab.added_by:
            return Response({"error": "You are not authorized to remove this collaborator."}, status=403)

        collab.delete()
        return Response({"message": f"{username} removed from collaborators."}, status=200)

class ChatMessagesAPIView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = ChatHistory.objects.filter(chat=chat).order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            owned_chats = Chat.objects.filter(
                user=request.user, is_deleted=False
            )
            shared_chats = Chat.objects.filter(
                collaborators__collaborator=request.user,
                collaborators__is_approved=True,
                is_deleted=False
            )

            chats = (owned_chats | shared_chats).distinct().order_by('-updated_at')
            serializer = ChatListSerializer(chats, many=True)
            return Response(serializer.data, status=200)

        except Exception as e:
            logger.error(f"Error fetching chat list: {str(e)}", exc_info=True)
            return Response({"error": "Unable to fetch chat list."}, status=500)




class ChatAPIView(APIView):
    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        prompt = request.data.get("prompt")
        chat_id = request.data.get("chat_id")
        guest_id = request.data.get("guest_id")
        ip = get_client_ip(request)

        if not prompt:
            return Response(
                {"error": "Please enter a message to begin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guest user flow
        if not user:
            if not guest_id:
                return Response({
                    "error": "Guest session expired. Please refresh and try again."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                guest_uuid = UUID(guest_id)
            except ValueError:
                return Response({
                    "error": "Invalid guest session ID. Please refresh the page."
                }, status=status.HTTP_400_BAD_REQUEST)

            guest_tracker, _ = GuestChatTracker.objects.get_or_create(guest_id=guest_uuid)
            ip_tracker, _ = GuestIPTracker.objects.get_or_create(ip_address=ip)

            if guest_tracker.count >= 10 or ip_tracker.count >= 10:
                return Response({
                    "limit_exceeded": True,
                    "message": "You've reached your guest chat limit. Please log in to continue."
                }, status=status.HTTP_200_OK)

        # Get or create chat
        try:
            if user:
                if chat_id:
                    chat = Chat.objects.get(id=chat_id)
                    
                    # Ownership or collaborator check
                    if chat.user != user:
                        collaborator = ChatCollaborator.objects.filter(chat=chat, collaborator=user, is_approved=True).first()
                        if not collaborator:
                            return Response({"error": "You do not have access to this chat."}, status=403)
                        if collaborator.access_level != "edit":
                            return Response({"error": "You don't have permission to modify this chat."}, status=403)
                else:
                    chat = Chat.objects.create(user=user, title="New Chat")
            else:
                chat = None  # Guests don't persist chat
        except Chat.DoesNotExist:
            return Response({
                "error": "We couldn't find that chat session."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"[Chat Init] {e}", exc_info=True)
            return Response({
                "error": "We had trouble starting your chat. Please try again."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # OpenAI call
        try:
            res = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
            )
            bot_reply = res.choices[0].message.content
        except Exception as e:
            logger.error(f"[OpenAI Error] {e}", exc_info=True)
            return Response({
                "error": "We're having trouble responding. Please try again shortly."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save chat history
        if user:
            try:
                ChatHistory.objects.create(
                    chat=chat,
                    user=user,
                    prompt=prompt,
                    response=bot_reply
                )
            except Exception as e:
                logger.warning(f"[History Save Fail] {e}", exc_info=True)

        # Update guest usage
        if not user:
            guest_tracker.count += 1
            guest_tracker.save()
            ip_tracker.count += 1
            ip_tracker.save()

        return Response({
            "chat_id": chat.id if chat else None,
            "response": bot_reply,
            "limit_exceeded": False
        }, status=status.HTTP_200_OK)



class ChatDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, chat_id):
        new_title = request.data.get("title")
        if not new_title:
            return Response({"error": "Title is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        chat.title = new_title
        chat.save()
        return Response({"message": "Chat title updated successfully.", "title": new_title})

    def delete(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        chat.is_deleted = True
        chat.save()
        return Response({"message": "Chat deleted successfully."}, status=204)


class ChatMessagesView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        user = request.user

        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        is_owner = chat.user == user
        is_approved_collab = ChatCollaborator.objects.filter(
            chat=chat,
            collaborator=user,
            is_approved=True
        ).exists()

        if not is_owner and not is_approved_collab:
            return Response({"error": "Unauthorized"}, status=403)

        messages = ChatHistory.objects.filter(chat=chat).order_by("timestamp")
        data = [
            {
                "id": m.id,
                "prompt": m.prompt,
                "response": m.response,
                "timestamp": m.timestamp,
                "context": m.context
            }
            for m in messages
        ]
        return Response(data, status=200)



class StartNewChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        chat = Chat.objects.create(user=user, title="Untitled")
        return Response({
            "message": "New chat session started.",
            "chat_id": chat.id,
            "title": chat.title
        }, status=201)


class CommitChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat_id = request.data.get("chat_id")

        if not chat_id:
            return Response({"error": "Chat ID is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        user = request.user
        is_owner = chat.user == user
        has_edit_access = ChatCollaborator.objects.filter(
            chat=chat,
            collaborator=user,
            is_approved=True,
            access_level="edit"
        ).exists()

        if not is_owner and not has_edit_access:
            return Response({"error": "You do not have permission to modify this chat."}, status=403)

        messages = ChatHistory.objects.filter(chat=chat).order_by("timestamp")[:2]

        if messages.count() < 2:
            return Response(
                {"error": "At least two messages are required to generate a title."},
                status=400
            )

        title = generate_chat_title_from_openai([
            {"role": "user", "content": messages[0].prompt},
            {"role": "assistant", "content": messages[0].response}
        ]) or "New Chat"

        chat.title = title
        chat.save()

        return Response({"chat_id": chat.id, "title": title}, status=200)


from rest_framework.views import APIView

class UpdateChatTitleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        # Owner check
        if chat.user == request.user:
            allowed = True
        else:
            collab = ChatCollaborator.objects.filter(
                chat=chat,
                collaborator=request.user,
                is_approved=True,
                access_level="edit"  # <-- must be edit
            ).first()
            allowed = bool(collab)

        if not allowed:
            return Response({"error": "Permission denied."}, status=403)

        title = request.data.get("title")
        if title:
            chat.title = title
            chat.save()

        return Response({"message": "Chat updated."})

class DeleteChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        user = request.user

        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        # Check ownership or edit-level collaborator
        is_owner = chat.user == user
        has_edit_access = ChatCollaborator.objects.filter(
            chat=chat,
            collaborator=user,
            is_approved=True,
            access_level="edit"
        ).exists()

        if not is_owner and not has_edit_access:
            return Response({"error": "You do not have permission to delete this chat."}, status=403)

        chat.is_deleted = True
        chat.save()
        return Response({"message": "Chat deleted successfully."}, status=200)


class StartNewChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat = Chat.objects.create(user=request.user, title="New Chat")
        return Response({"chat_id": chat.id, "message": "New chat started."}, status=201)


from django.db.models import Q

class ListUsersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.GET.get("q", "").strip()
        users = User.objects.exclude(id=request.user.id)
        if query:
            users = users.filter(Q(username__icontains=query) | Q(email__icontains=query))
        data = [{"id": u.id, "username": u.username, "email": u.email} for u in users]
        return Response(data)


class ShareChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id, user=request.user)
        user_ids = request.data.get("user_ids", [])
        access_level = request.data.get("access_level", "view")

        if access_level not in ["view", "edit"]:
            return Response({"error": "Invalid access level."}, status=status.HTTP_400_BAD_REQUEST)

        added = []
        skipped = []
        for uid in user_ids:
            user = User.objects.filter(id=uid).first()
            if not user:
                skipped.append(uid)
                continue

            obj, created = ChatCollaborator.objects.get_or_create(
                chat=chat, collaborator=user,
                defaults={"added_by": request.user, "access_level": access_level, "is_approved": False}
            )
            if created:
                added.append(user.username)
            else:
                skipped.append(user.username)

        return Response({
            "added": added,
            "skipped": skipped
        })


class ApproveCollaborationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        collab = get_object_or_404(
            ChatCollaborator, chat_id=chat_id, collaborator=request.user, is_approved=False
        )
        collab.is_approved = True
        collab.save()
        return Response({"message": "Collaboration approved."})



class EmailShareAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        email = request.data.get("email")
        access_level = request.data.get("access_level", "view")
        user = User.objects.filter(email=email).first()
        chat = get_object_or_404(Chat, id=chat_id, user=request.user)

        if not user:
            return Response({"error": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({"error": "You cannot share the chat with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        _, created = ChatCollaborator.objects.get_or_create(
            chat=chat, collaborator=user,
            defaults={"added_by": request.user, "access_level": access_level, "is_approved": False}
        )
        # Replace this with actual email logic if needed.
        return Response({"message": f"Chat shared with {user.username}."})




class ListCollaboratorsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        # Check access
        is_owner = chat.user == request.user
        is_collaborator = ChatCollaborator.objects.filter(
            chat=chat, collaborator=request.user, is_approved=True
        ).exists()

        if not is_owner and not is_collaborator:
            return Response({"error": "Not authorized."}, status=403)

        # Get actual collaborators
        collaborators = list(ChatCollaborator.objects.filter(chat=chat))

        # Add the owner as a pseudo-collaborator
        owner_user = chat.user
        owner_data = {
            "id": -1,  # Indicates synthetic collaborator
            "chat": chat.id,
            "collaborator": {
                "id": owner_user.id,
                "username": owner_user.username,
                "email": owner_user.email
            },
            "added_by": {
                "id": owner_user.id,
                "username": owner_user.username,
                "email": owner_user.email
            },
            "access_level": "edit",
            "is_approved": True,
            "added_at": chat.created_at,
            "is_owner": True
        }

        # Serialize real collaborators
        serializer = ChatCollaboratorSerializer(collaborators, many=True)
        data = serializer.data

        # Add synthetic owner entry
        data.insert(0, owner_data)

        return Response(data, status=200)


class PendingCollaborationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collaborations = ChatCollaborator.objects.filter(
            collaborator=request.user,
            is_approved=False
        ).select_related("chat", "chat__user")  # important

        data = [{
            "id": c.chat.id,
            "title": c.chat.title,
            "owner": {
                "id": c.chat.user.id,
                "username": c.chat.user.username,
                "email": c.chat.user.email
            }
        } for c in collaborations]

        return Response(data)

class RejectCollaborationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        try:
            collab = ChatCollaborator.objects.get(chat=chat, collaborator=request.user, is_approved=False)
        except ChatCollaborator.DoesNotExist:
            return Response({"error": "No pending invitation found."}, status=404)

        collab.delete()
        return Response({"success": "Collaboration rejected."})


# views.py - Add these new views
class AudioToTextView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({"error": "No audio file provided"}, status=400)
        
        # Save the audio file first
        audio_obj = AudioFile.objects.create(
            user=request.user,
            file=audio_file
        )
        
        try:
            # Transcribe using OpenAI Whisper
            with open(audio_obj.file.path, 'rb') as f:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=f
                )
            
            audio_obj.transcript = transcript.text
            audio_obj.save()
            
            return Response({
                "id": audio_obj.id,
                "transcript": transcript.text
            })
            
        except Exception as e:
            logger.error(f"Audio transcription failed: {str(e)}")
            return Response({"error": "Transcription failed"}, status=500)

class TextToAudioView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get('text')
        if not text:
            return Response({"error": "No text provided"}, status=400)
        
        try:
            # Generate speech using OpenAI TTS
            response = client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=text
            )
            
            # Save the response
            tts_obj = TextToSpeech.objects.create(
                user=request.user,
                text=text
            )
            
            # Save the audio file
            file_path = f"text_to_speech/{tts_obj.id}.mp3"
            tts_obj.audio_file.save(file_path, ContentFile(response.content))
            
            return Response({
                "id": tts_obj.id,
                "audio_url": request.build_absolute_uri(tts_obj.audio_file.url)
            })
            
        except Exception as e:
            logger.error(f"Text-to-speech failed: {str(e)}")
            return Response({"error": "Text-to-speech conversion failed"}, status=500)
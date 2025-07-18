#files/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import File, Transcription, GeneratedQuestion
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.utils import timezone
import mimetypes
from rest_framework.parsers import MultiPartParser, FormParser
from .models import File
from .serializers import FileSerializer
# files/views.py or questions/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import GeneratedQuestion
from .serializers import GeneratedQuestionSerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework import status
from .models import GeneratedQuestion
from .utils import score_theory_answer  # To be added
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from openai import OpenAI
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)
client = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))


class ScoreQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        questions = data.get("questions", [])
        user_answers = data.get("userAnswers", {})
        extracted_text = data.get("context", "").strip()

        if not questions or not user_answers or not extracted_text:
            return Response(
                {"error": "Missing questions, answers, or extracted text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            context_snippet = extracted_text[:3000]

            # Reformat questions for AI input
            qset = []
            for q in questions:
                q_id = str(q.get("id"))
                qset.append({
                    "id": q_id,
                    "question": q.get("question") or q.get("text", ""),
                    "correct_answer": q.get("answer") or q.get("correct_answer", ""),
                    "user_answer": user_answers.get(q_id, "")
                })

            prompt = self.build_prompt(context_snippet, qset)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational AI that scores student answers. Return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=700
            )

            content = response.choices[0].message.content.strip()

            # Strip code block formatting if present
            if content.startswith("```"):
                content = content.strip("`").strip()
                if content.lower().startswith("json"):
                    content = content[4:].strip()

            result = json.loads(content)

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.warning(f"AI scoring failed: {e}")
            return Response({"error": "Scoring failed. Try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def build_prompt(self, context: str, qset: list[dict]) -> str:
        return (
            f"Context for the questions:\n"
            f"{context}\n\n"
            f"Here are the questions with student answers. Return JSON ONLY with a score and details.\n\n"
            f"Each item:\n"
            f"- id\n"
            f"- question\n"
            f"- correct_answer\n"
            f"- user_answer\n\n"
            f"Return:\n"
            f'{{\n'
            f'  "score": {{\n'
            f'    "correct": int,\n'
            f'    "total": int,\n'
            f'    "percentage": float\n'
            f'  }},\n'
            f'  "detailed": [\n'
            f'    {{ "id": "...", "correct": true/false, "comment": "why this was marked" }}\n'
            f'  ]\n'
            f'}}\n\n'
            f"Questions:\n{json.dumps(qset, indent=2)}"
        )

class ListGeneratedQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        questions = GeneratedQuestion.objects.filter(user=request.user).order_by("-created_at")
        serializer = GeneratedQuestionSerializer(questions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



class FileUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = File.objects.create(user=request.user, file=uploaded_file)

        # ✅ Add MIME type detection using `mimetypes`
        mime_type, _ = mimetypes.guess_type(file_obj.file.path)
        file_obj.mime_type = mime_type or "application/octet-stream"
        file_obj.save()

        serializer = FileSerializer(file_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import File, Transcription, GeneratedQuestion
from .utils import (
    extract_text_from_file,
    extract_text_and_images_from_file,
    generate_questions_from_text,
    generate_questions_from_text_and_images,
)
from .serializers import GeneratedQuestionSerializer


class GenerateQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        source_type = data.get('source_type')
        source_id = data.get('source_id')  # Optional for 'chat'
        source_text = data.get('source_text', '').strip()
        mode = data.get('mode', 'both').lower()
        visuals = data.get('visuals', False)
        difficulty = data.get('difficulty', 'medium').lower()
        num_questions = int(data.get('num_questions', 5))

        text = ""
        questions = []
        warning_msg = None

        try:
            if source_type == 'file':
                file_obj = get_object_or_404(File, id=source_id, user=user)

                if visuals:
                    text, image_map = extract_text_and_images_from_file(file_obj.file)
                    questions, warning_msg = generate_questions_from_text_and_images(
                        text=text,
                        image_map=image_map,
                        mode=mode,
                        visuals=visuals,
                        difficulty=difficulty,
                        num_questions=num_questions
                    )
                else:
                    text = extract_text_from_file(file_obj.file)
                    questions, warning_msg = generate_questions_from_text(
                        text=text,
                        mode=mode,
                        visuals=False,
                        difficulty=difficulty,
                        num_questions=num_questions
                    )

            elif source_type == 'transcript':
                transcription = get_object_or_404(Transcription, id=source_id, user=user)
                text = transcription.transcription
                questions, warning_msg = generate_questions_from_text(
                    text=text,
                    mode=mode,
                    visuals=False,
                    difficulty=difficulty,
                    num_questions=num_questions
                )

            elif source_type == 'chat':
                if not source_text or len(source_text) < 10:
                    return Response({"error": "Source text is too short or empty."}, status=400)
                text = source_text
                source_id = 0
                questions, warning_msg = generate_questions_from_text(
                    text=text,
                    mode=mode,
                    visuals=False,
                    difficulty=difficulty,
                    num_questions=num_questions
                )

            else:
                return Response({"error": "Unsupported source type."}, status=400)

        except Exception as e:
            return Response({"error": f"Failed to process source: {str(e)}"}, status=500)

        if not questions:
            return Response({"error": "No questions were generated."}, status=500)

        saved_questions = []
        print(saved_questions)
        for q in questions:
            obj = GeneratedQuestion.objects.create(
                user=user,
                source_type=source_type,
                source_id=source_id,
                question=q.get("question"),
                answer=q.get("answer"),
                options=q.get("options"),
                visual_aid=q.get("visual_aid"),
                difficulty=q.get("difficulty", difficulty),
            )
            saved_questions.append({
                "id": obj.id,
                "question": obj.question,
                "answer": obj.answer,
                "options": obj.options,
                "visual_aid": obj.visual_aid,
                "difficulty": obj.difficulty,
            })

        response_data = {
            "questions": saved_questions,
            "context": text  
        }

        print(response_data)
        print(warning_msg)
        print(saved_questions)
        if warning_msg:
            response_data["warning"] = warning_msg

        return Response(response_data, status=201)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import GeneratedQuestion
from django.shortcuts import get_object_or_404

class DeleteGeneratedQuestionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        question = get_object_or_404(GeneratedQuestion, id=pk, user=request.user)
        question.delete()
        return Response({"success": "Question deleted."}, status=status.HTTP_204_NO_CONTENT)

# files/views.py


from rest_framework import permissions
from .models import File, FileSummary
from .utils import summarize_file_with_vision
from .serializers import FileSerializer, FileSummarySerializer

logger = logging.getLogger(__name__)

class FileSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("file_id")
        format_choice = request.data.get("format", "text").lower()

        if format_choice not in ("text", "file"):
            return Response({"error": "Invalid format. Must be 'text' or 'file'."}, status=400)

        try:
            file_obj = File.objects.get(id=file_id, user=request.user)
        except File.DoesNotExist:
            return Response({"error": "File not found."}, status=404)

        summary_text, warning_msg = summarize_file_with_vision(file_obj)

        if not summary_text:
            return Response(
                {"error": "Failed to generate summary.", "warning": warning_msg},
                status=500
            )

        if format_choice == "file":
            summary = FileSummary.objects.create(
                user=request.user,
                file=file_obj,
                summary_text=summary_text,
                format="file"
            )
            serialized = FileSummarySerializer(summary)
            return Response(
                {"summary": serialized.data, "warning": warning_msg},
                status=201
            )

        # If text format, return directly as chat content
        return Response(
            {"summary": summary_text, "warning": warning_msg},
            status=200
        )


# files/views.py

import tempfile
from .serializers import TextToSpeechSerializer
from .models import Audio, File


client = OpenAI(api_key=settings.OPENAI_API_KEY)

class GenerateAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TextToSpeechSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        text = data.get("text")
        file_id = data.get("file_id")
        voice = data["voice"]
        speed = data["speed"]
        user = request.user

        if file_id:
            try:
                file_obj = File.objects.get(id=file_id, user=user)
                from .utils import extract_text_from_file
                text = extract_text_from_file(file_obj.file)
                if not text:
                    return Response({"error": "Unable to extract text from file."}, status=400)
            except File.DoesNotExist:
                return Response({"error": "File not found."}, status=404)

        try:
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice,
                speed=speed,
                input=text
            )

            # Save audio file to temp and reattach to model
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                response.stream_to_file(tmp.name)
                tmp_path = tmp.name

            with open(tmp_path, "rb") as f:
                django_file = f.read()

            filename = f"{voice}_{user.username}_tts.mp3"
            audio_instance = Audio.objects.create(
                user=user,
                file=file_obj if file_id else None,
                text_input=text if not file_id else None,
                source_type="tts",
                voice=voice,
                speed=speed,
            )
            audio_instance.audio.save(filename, content=django_file)

            return Response({
                "success": True,
                "audio_id": audio_instance.id,
                "audio_url": audio_instance.audio.url
            }, status=201)

        except Exception as e:
            import logging
            logging.warning(f"TTS generation failed: {e}")
            return Response({"error": "Failed to generate audio."}, status=500)

from .serializers import AudioSerializer

class ListAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        audio_qs = Audio.objects.filter(user=request.user).order_by("-created_at")
        serializer = AudioSerializer(audio_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class DeleteAudioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, audio_id):
        audio = get_object_or_404(Audio, id=audio_id, user=request.user)
        audio.audio.delete(save=False)  # delete actual file
        audio.delete()  # delete record
        return Response({"message": "Audio deleted."}, status=status.HTTP_204_NO_CONTENT)
    
from django.http import FileResponse
import os

class DownloadAudioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, audio_id):
        audio = get_object_or_404(Audio, id=audio_id, user=request.user)

        if not audio.audio:
            return Response({"error": "Audio not found."}, status=404)

        file_path = audio.audio.path
        file_name = os.path.basename(file_path)

        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_name)
        return response


# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import SharedAudio, Audio
from .serializers import SharedAudioSerializer

class ShareAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, audio_id):
        audio = get_object_or_404(Audio, id=audio_id, user=request.user)
        recipient_username = request.data.get("username")
        note = request.data.get("note", "")
        recipient = get_object_or_404(User, username=recipient_username)

        obj, created = SharedAudio.objects.get_or_create(
            audio=audio,
            shared_by=request.user,
            shared_with=recipient,
            defaults={"note": note}
        )
        if not created:
            return Response({"error": "Already shared to this user."},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = SharedAudioSerializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RespondSharedAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, share_id):
        action = request.data.get("action")
        obj = get_object_or_404(SharedAudio, id=share_id, shared_with=request.user)

        if obj.status != SharedAudio.STATUS_PENDING:
            return Response({"error": "Already responded."}, status=status.HTTP_400_BAD_REQUEST)

        if action == "accept":
            obj.status = SharedAudio.STATUS_ACCEPTED
        elif action == "reject":
            obj.status = SharedAudio.STATUS_REJECTED
        else:
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        obj.responded_at = timezone.now()
        obj.save()
        return Response(SharedAudioSerializer(obj).data, status=status.HTTP_200_OK)


class ListSharedAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        received = SharedAudio.objects.filter(shared_with=request.user, status=SharedAudio.STATUS_ACCEPTED)
        sent = SharedAudio.objects.filter(shared_by=request.user)
        data = {
            "received": SharedAudioSerializer(received, many=True).data,
            "sent": SharedAudioSerializer(sent, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)

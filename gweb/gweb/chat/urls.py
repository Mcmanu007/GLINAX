from django.urls import path
from .views import (
    ChatAPIView, CommitChatView, ChatListAPIView, ChatMessagesAPIView,
    UpdateChatTitleAPIView, DeleteChatAPIView, StartNewChatAPIView,
    ShareChatAPIView, AddCollaboratorAPIView, RemoveCollaboratorAPIView,
    ChatDetailView, ChatMessagesView, EmailShareAPIView,
    ListCollaboratorsAPIView, ApproveCollaborationAPIView,
    PendingCollaborationsAPIView, ListUsersAPIView, RejectCollaborationAPIView
)

urlpatterns = [
    path('', ChatAPIView.as_view(), name='chat'),
    path('commit/', CommitChatView.as_view(), name='chat-commit'),
    path('list/', ChatListAPIView.as_view(), name='chat-list'),
    path('start/', StartNewChatAPIView.as_view(), name='chat-start'),

    # Single chat
    path('<int:chat_id>/', ChatDetailView.as_view(), name='chat-detail'),
    path('<int:chat_id>/title/', UpdateChatTitleAPIView.as_view(), name='chat-title-update'),
    path('<int:chat_id>/delete/', DeleteChatAPIView.as_view(), name='chat-delete'),
    path('<int:chat_id>/messages/', ChatMessagesAPIView.as_view(), name='chat-messages'),
    path('history/<int:chat_id>/', ChatMessagesView.as_view(), name='chat-history'),
    path('<int:chat_id>/update/', UpdateChatTitleAPIView.as_view(), name='chat-update'),
    # Collaborator management
    path('<int:chat_id>/collaborators/', ListCollaboratorsAPIView.as_view(), name='chat-collaborators'),
    path('<int:chat_id>/collaborators/add/', AddCollaboratorAPIView.as_view(), name='collaborator-add'),
    path('<int:chat_id>/collaborators/remove/', RemoveCollaboratorAPIView.as_view(), name='collaborator-remove'),
    path('<int:chat_id>/collaborators/approve/', ApproveCollaborationAPIView.as_view(), name='collaborator-approve'),
    path('collaborators/pending/', PendingCollaborationsAPIView.as_view(), name='collaborator-pending'),
    path('<int:chat_id>/collaborators/reject/', RejectCollaborationAPIView.as_view(), name='collaborator-reject'),

    # Sharing
    path('<int:chat_id>/share/', ShareChatAPIView.as_view(), name='chat-share'),
    path('<int:chat_id>/share/email/', EmailShareAPIView.as_view(), name='chat-email-share'),

    # List all users
    path('users/', ListUsersAPIView.as_view(), name='chat-users'),
]

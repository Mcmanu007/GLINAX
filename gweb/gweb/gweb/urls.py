"""
URL configuration for gweb project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

from payments import views 

def home(request):
    return HttpResponse("🍻Welcome to the Glinax Backend!")

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/auth/', include('g_auth.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/', include('files.urls')),
    path('pay/', views.initiate_payment, name='initiate_payment'),
    path('payment/verify/', views.verify_payment, name='verify_payment'),
    path('payment/webhook/', views.paystack_webhook, name='paystack_webhook'),
    # Fallback URLs if views aren't available
    path('payment/error/', TemplateView.as_view(template_name='payments/error.html'), name='payment_error'),
]
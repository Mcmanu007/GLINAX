from django.shortcuts import render, redirect
from django.conf import settings
import requests
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseBadRequest
from .models import UserPayment, UserProfile
from django.utils import timezone
from django.contrib.auth.models import User
import hashlib
import hmac
import json

@login_required
def initiate_payment(request):
    # Handle payment initiation with Paystack (supports cards and mobile money)
    paystack_secret_key = settings.PAYSTACK_SECRET_KEY
    amount = 1000  # 10.00 GHS 
    email = request.user.email

    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {paystack_secret_key}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "amount": amount,
        "currency": "GHS",  # Important for Ghanaian mobile money
        "callback_url": request.build_absolute_uri('/payment/verify/'),
        "metadata": {
            "user_id": request.user.id,
            "custom_fields": [
                {
                    "display_name": "Payment For",
                    "variable_name": "payment_for",
                    "value": "Premium Upgrade"
                }
            ]
        }
    }

    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        return redirect(response.json()['data']['authorization_url'])
    else:
        error_message = response.json().get('message', 'Failed to initiate payment')
        return render(request, 'payment_error.html', {"message": error_message})

@login_required
def verify_payment(request):
    # Verify Paystack payment (works for both card and mobile money)
    reference = request.GET.get('reference')
    if not reference:
        return HttpResponseBadRequest("Missing reference")

    paystack_secret_key = settings.PAYSTACK_SECRET_KEY
    url = f"https://api.paystack.co/transaction/verify/{reference}"
    headers = {"Authorization": f"Bearer {paystack_secret_key}"}

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data['data']['status'] == 'success':
            # Save payment
            UserPayment.objects.create(
                user=request.user,
                paystack_reference=reference,
                amount=data['data']['amount'] / 100,  # Convert to GHS
                currency=data['data']['currency'],
                payment_method=data['data']['channel'],  # card/mobile_money
                status='success',
                raw_response=data
            )

            # Upgrade user
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            profile.is_premium = True
            profile.save()

            return render(request, 'payment_success.html', {'data': data})
    return render(request, 'payment_error.html', {"message": "Payment not successful"})


@csrf_exempt
def paystack_webhook(request):
    #Verify Paystack webhook signature
    if request.method != 'POST':
        return JsonResponse({"status": "failed"}, status=400)
    
    # Get the Paystack signature header
    paystack_signature = request.headers.get('x-paystack-signature')
    if not paystack_signature:
        return JsonResponse({"status": "missing signature"}, status=403)
    
    # Get the request body
    body = request.body.decode('utf-8')
    secret_key = settings.PAYSTACK_SECRET_KEY
    
    #Compute HMAC SHA512 hash
    computed_signature = hmac.new(
        secret_key.encode('utf-8'),
        body.encode('utf-8'),
        digestmod=hashlib.sha512
    ).hexdigest()
    
    # Verify signatures match
    if not hmac.compare_digest(computed_signature, paystack_signature):
        return JsonResponse({"status": "invalid signature"}, status=403)
    
    # Process verified webhook event
    try:
        payload = json.loads(body)
        event = payload.get('event')
        
        if event == 'charge.success':
            reference = payload['data']['reference']
            
            # Handle successful payment
            
            UserPayment.objects.create(
                user=User.objects.get(id=payload['data']['metadata']['user_id']),
                paystack_reference=reference,
                amount=payload['data']['amount'] / 100,
                currency=payload['data']['currency'],
                payment_method=payload['data']['channel'],
                status='success',
                raw_response=payload
            )
            
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# Usage tracking views
@login_required
def generate_question(request):
    profile = request.user.userprofile
    question_type = request.GET.get('type', 'mcq')

    if not profile.is_premium:
        if profile.questions_generated >= 20:
            return JsonResponse({'error': 'Free question limit reached. Upgrade to premium.'})
        if question_type in ['theory', 'true_false', 'fill_in']:
            return JsonResponse({'error': 'This question type requires a premium account.'})

    question = f"Sample {question_type} question."

    if not profile.is_premium:
        profile.questions_generated += 1
        profile.save()

    return JsonResponse({'question': question})

@login_required
def generate_audio(request):
    profile = request.user.userprofile
    minutes = float(request.GET.get('minutes', 1.0))

    if not profile.is_premium and (profile.audio_minutes_used + minutes > 10):
        return JsonResponse({'error': 'Free audio limit reached. Upgrade to premium.'})

    audio_url = "https://example.com/audio/output.mp3"

    if not profile.is_premium:
        profile.audio_minutes_used += minutes
        profile.save()

    return JsonResponse({'audio_url': audio_url})

def reset_usage():
    #Monthly reset of free user limits
    for profile in UserProfile.objects.filter(is_premium=False):
        profile.questions_generated = 0
        profile.audio_minutes_used = 0
        profile.image_actions = 0
        profile.save()
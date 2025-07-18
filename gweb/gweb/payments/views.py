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
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

# ========== PAYMENT VIEWS ==========

@login_required
def initiate_payment(request):
    """Improved payment initiation with better error handling"""
    try:
        # Prevent duplicate premium purchases
        if hasattr(request.user, 'userprofile') and request.user.userprofile.is_premium:
            return render(request, 'payment_error.html', 
                        {"message": "You already have a premium account"})

        response = requests.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": request.user.email,
                "amount": "2500",  # 25.00 GHS
                "currency": "GHS",
                "callback_url": request.build_absolute_uri('/payment/verify/'),
                "metadata": {
                    "user_id": request.user.id,
                    "custom_fields": [{
                        "display_name": "Payment For",
                        "variable_name": "payment_for",
                        "value": "Premium Upgrade"
                    }]
                }
            },
            timeout=10  # Add timeout to prevent hanging
        )

        if response.status_code == 200:
            return redirect(response.json()['data']['authorization_url'])
        else:
            error_data = response.json()
            logger.error(f"Paystack error: {error_data.get('message')}")
            return render(request, 'payment_error.html', 
                         {"message": error_data.get('message', 'Payment failed')})

    except requests.exceptions.RequestException as e:
        logger.error(f"Payment initiation failed: {str(e)}")
        return render(request, 'payment_error.html', 
                     {"message": "Payment service unavailable. Please try again later."})

@login_required
@transaction.atomic
def verify_payment(request):
    """Transaction-protected payment verification"""
    reference = request.GET.get('reference')
    if not reference:
        return HttpResponseBadRequest("Missing reference")

    # Check for duplicate payment
    if UserPayment.objects.filter(paystack_reference=reference).exists():
        return render(request, 'payment_success.html', 
                     {"message": "Payment already processed"})

    try:
        response = requests.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data['data']['status'] == 'success':
                # Create payment record
                UserPayment.objects.create(
                    user=request.user,
                    paystack_reference=reference,
                    amount=data['data']['amount'] / 100,
                    currency=data['data']['currency'],
                    payment_method=data['data']['channel'],
                    status='success',
                    raw_response=data
                )

                # Upgrade user
                profile, created = UserProfile.objects.get_or_create(user=request.user)
                profile.is_premium = True
                profile.save()

                return render(request, 'payment_success.html', {'data': data})

    except requests.exceptions.RequestException as e:
        logger.error(f"Payment verification failed: {str(e)}")

    return render(request, 'payment_error.html', 
                {"message": "Payment verification failed. Please contact support."})

@csrf_exempt
def paystack_webhook(request):
    """Secure webhook handler with duplicate check"""
    if request.method != 'POST':
        return JsonResponse({"status": "failed"}, status=400)
    
    # Signature verification
    paystack_signature = request.headers.get('x-paystack-signature')
    if not paystack_signature:
        return JsonResponse({"status": "missing signature"}, status=403)
    
    body = request.body.decode('utf-8')
    computed_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
        body.encode('utf-8'),
        digestmod=hashlib.sha512
    ).hexdigest()
    
    if not hmac.compare_digest(computed_signature, paystack_signature):
        return JsonResponse({"status": "invalid signature"}, status=403)
    
    try:
        payload = json.loads(body)
        if payload.get('event') == 'charge.success':
            data = payload['data']
            reference = data['reference']
            
            # Check for duplicate before processing
            if not UserPayment.objects.filter(paystack_reference=reference).exists():
                with transaction.atomic():
                    UserPayment.objects.create(
                        user=User.objects.get(id=data['metadata']['user_id']),
                        paystack_reference=reference,
                        amount=data['amount'] / 100,
                        currency=data['currency'],
                        payment_method=data['channel'],
                        status='success',
                        raw_response=payload
                    )
                    profile, _ = UserProfile.objects.get_or_create(
                        user_id=data['metadata']['user_id']
                    )
                    profile.is_premium = True
                    profile.save()
        
        return JsonResponse({"status": "success"})
    
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# ========== USAGE TRACKING ==========

@login_required
def generate_question(request):
    """Improved usage tracking with rate limiting"""
    profile = request.user.userprofile
    question_type = request.GET.get('type', 'mcq').lower()

    # Free tier restrictions
    if not profile.is_premium:
        if profile.questions_generated >= 20:
            return JsonResponse(
                {'error': 'Free question limit reached. Upgrade to premium.'},
                status=429  # Too Many Requests
            )
        if question_type in ['theory', 'true_false', 'fill_in']:
            return JsonResponse(
                {'error': 'Premium question type. Upgrade your account.'},
                status=403
            )

    # Generate question (placeholder implementation)
    question = f"Sample {question_type} question."

    # Update usage counter
    if not profile.is_premium:
        profile.questions_generated += 1
        profile.save()

    return JsonResponse({'question': question})

@login_required
def generate_audio(request):
    """Audio generation with usage tracking"""
    profile = request.user.userprofile
    
    try:
        minutes = min(float(request.GET.get('minutes', 1.0)), 30)  # Cap at 30 mins
    except ValueError:
        return JsonResponse({'error': 'Invalid minutes value'}, status=400)

    # Free tier restrictions
    if not profile.is_premium:
        if profile.audio_minutes_used + minutes > 10:
            return JsonResponse(
                {'error': 'Free audio limit reached. Upgrade to premium.'},
                status=429
            )

    # Generate audio (placeholder implementation)
    audio_url = "https://example.com/audio/output.mp3"

    # Update usage counter
    if not profile.is_premium:
        profile.audio_minutes_used += minutes
        profile.save()

    return JsonResponse({'audio_url': audio_url})

def reset_usage():
    """Optimized monthly reset using bulk update"""
    UserProfile.objects.filter(is_premium=False).update(
        questions_generated=0,
        audio_minutes_used=0,
        image_actions=0
    )

from openai import OpenAI
import logging
from .models import TextToSpeech
logger = logging.getLogger(__name__)
client = OpenAI()

def generate_chat_title_from_openai(messages: list[str]):
    """
    Generates a short title from the initial 2 messages of a chat.
    :param messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
    :return: string title or None
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages + [
                {
                    "role": "system",
                    "content": "Summarize the conversation into a short title (3-6 words). Return only the title."
                }
            ],
            max_tokens=20,
            temperature=0.4
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"OpenAI title generation failed: {e}")
        return None



def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def text_to_audio(user, text):
    """
    Generate speech from text using OpenAI TTS and save the audio to the database.
    """
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )

        tts_obj = TextToSpeech.objects.create(
            user=user,
            text=text
        )

        file_path = f"text_to_speech/{tts_obj.id}.mp3"
        tts_obj.audio_file.save(file_path, ContentFile(response.content))

        return tts_obj
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return None

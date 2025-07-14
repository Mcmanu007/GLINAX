from openai import OpenAI
import logging

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


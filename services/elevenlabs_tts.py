''' 
    Logic for ElevenLabs TTS API calls 
'''

import os
import requests
import base64

def synthesize_speech(text):
    """
    Calls the ElevenLabs API to convert text to speech audio.

    Args:
        text (str): The text to be synthesized.

    Returns:
        tuple: A tuple containing (audio_content_base64, mime_type, message) or (None, None, error_message).
    """
    api_key = os.getenv('ELEVENLABS_API_KEY')
    voice_id = os.getenv('ELEVENLABS_VOICE_ID')
    
    if not api_key or not voice_id:
        print("ElevenLabs API key or Voice ID is missing. Using browser TTS fallback.")
        return None, 'audio/mpeg', 'Using browser TTS fallback'

    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}
        }

        response = requests.post(url, headers=headers, json=data)

        if response.ok:
            audio_content_base64 = base64.b64encode(response.content).decode('utf-8')
            return audio_content_base64, 'audio/mpeg', 'ElevenLabs TTS successful'
        else:
            error_details = response.text
            print(f"ElevenLabs API Error: {error_details}")
            return None, 'audio/mpeg', 'ElevenLabs failed, falling back to browser TTS'

    except Exception as e:
        print(f"ElevenLabs request exception: {e}")
        return None, 'audio/mpeg', 'TTS exception, falling back to browser TTS'
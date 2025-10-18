'''
    Logic for Fal.ai image generation API calls
'''

import os
import requests
import json

def generate_visual_aid(groq_client, concept_text):
    """
    Generates a high-quality image URL from Fal.ai based on a concept.

    Args:
        groq_client (Groq): Initialized Groq client.
        concept_text (str): The text the image should illustrate.

    Returns:
        tuple: A tuple containing (image_url, prompt_used) or (None, error_message).
    """
    fal_api_key = os.getenv('FAL_AI_API_KEY')
    if not fal_api_key:
        return None, 'Fal.ai API key is missing.'

    try:
        # --- 1. Use Groq to generate a high-quality image prompt ---
        prompt_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Convert the following educational explanation into a concise, detailed, single-sentence prompt for an AI image model, aiming for a clear, diagram-like illustration, a simple analogy, or a clean graphic."},
                {"role": "user", "content": f"Explanation: {concept_text}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=150
        )
        image_prompt = prompt_completion.choices[0].message.content
        
        # --- 2. Call Fal.ai for image generation ---
        fal_url = "https://fal.run/fal-ai/flux/schnell"
        headers = {
            "Authorization": f"Key {fal_api_key}",
            "Content-Type": "application/json"
        }
        # A good starting configuration for educational content
        payload = {
            "prompt": image_prompt,
            "image_size": "square_hd",
            "num_inference_steps": 4,
            "num_images": 1
        }
        
        print(f"Calling Fal.ai with prompt: {image_prompt}")
        fal_response = requests.post(fal_url, headers=headers, json=payload, timeout=30)
        
        print(f"Fal.ai response status: {fal_response.status_code}")
        print(f"Fal.ai response: {fal_response.text[:500]}")
        
        if fal_response.ok:
            fal_data = fal_response.json()
            # Check different possible response formats
            if 'images' in fal_data and fal_data['images']:
                image_url = fal_data['images'][0]['url']
                print(f"SUCCESS: Generated image URL: {image_url}")
                return image_url, image_prompt
            elif 'data' in fal_data and fal_data['data'] and 'images' in fal_data['data']:
                image_url = fal_data['data']['images'][0]['url']
                print(f"SUCCESS: Generated image URL: {image_url}")
                return image_url, image_prompt
            else:
                print(f"ERROR: Unexpected response format: {fal_data}")
                return None, f"No images in response: {fal_data}"
        else:
            print(f"ERROR: Fal.ai API failed with status {fal_response.status_code}")
            return None, f"API error {fal_response.status_code}: {fal_response.text}"

    except Exception as e:
        print(f"Visual generation exception: {e}")
        return None, f"An exception occurred during visual generation: {str(e)}"
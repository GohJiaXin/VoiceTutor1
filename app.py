from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv
import base64
import requests
from mem0 import Memory
import uuid
from datetime import datetime

load_dotenv()

app = Flask(__name__, static_folder='public')
CORS(app)

# Service Initialization
groq_client = None
memory = None
conversation_states = {}

try:
    if os.getenv('GROQ_API_KEY'):
        groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        print("✅ Groq initialized successfully")
    else:
        print("⚠️  GROQ_API_KEY not found. AI responses will not work.")

    if os.getenv('MEM0_API_KEY'):
        memory = Memory(api_key=os.getenv('MEM0_API_KEY'))
        print("✅ Mem0 initialized successfully")
    else:
        print("⚠️  MEM0_API_KEY not found. Memory features disabled.")
        
except Exception as error:
    print(f"Error initializing services: {error}")

# System Prompts
SYSTEM_PROMPTS = {
    "default": """You are VoiceTutor, an enthusiastic and expert AI study assistant. Your role is to:

1. EXPLAIN concepts clearly and conversationally in 2-3 sentences
2. BREAK DOWN complex topics into simple, digestible parts
3. ALWAYS end by confirming understanding with phrases like "Does this make sense to you?" or "Do you feel like you've got it now?"
4. USE encouraging and supportive language
5. ADAPT to the user's learning level
6. KEEP responses concise for voice interaction

Example format:
"Great question! [Clear explanation]. Does this make sense to you, or would you like me to explain it differently?" """,

    "interactive": """You are VoiceTutor, a conversational AI learning partner designed for voice-first interaction. You create dynamic, Socratic dialogue that goes far beyond rigid text responses.

CORE PHILOSOPHY:
- You are a conversational partner, not a textbook
- Every interaction flows naturally like a real conversation
- You adapt your teaching style to the learner's voice and responses
- You create genuine teaching moments through dialogue, not data dumps

CONVERSATIONAL TEACHING STYLE:
1. SPEAK NATURALLY: Use conversational language, not academic bullet points
2. BUILD ON RESPONSES: Always acknowledge what the learner said before continuing
3. USE ANALOGIES: Connect complex concepts to familiar experiences
4. CREATE DIALOGUE: Ask follow-up questions that feel natural in conversation

TONE: Conversational, enthusiastic, patient, curious. Like talking to a knowledgeable friend who loves teaching."""
}

def get_conversation_state(session_id):
    if session_id not in conversation_states:
        conversation_states[session_id] = {
            'mode': 'interactive',
            'current_topic': None,
            'question_history': [],
            'user_responses': [],
            'learning_level': 'beginner',
            'waiting_for_response': False,
            'last_question': None,
            'last_response': None
        }
    return conversation_states[session_id]

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        session_id = data.get('sessionId', str(uuid.uuid4()))
        is_response = data.get('isResponse', False)
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400

        if not groq_client:
            return jsonify({
                'error': 'AI service unavailable',
                'response': "I'm sorry, but the AI service is currently unavailable."
            }), 503

        state = get_conversation_state(session_id)
        
        # Get memories from Mem0
        memory_context = ""
        if memory:
            try:
                memories = memory.search(message, user_id=session_id)
                if memories:
                    memory_context = "\n\nRELEVANT MEMORIES:\n" + "\n".join([m['memory'] for m in memories])
            except Exception as e:
                print(f"Memory search failed: {e}")

        # Prepare system prompt
        system_prompt = SYSTEM_PROMPTS['interactive'] + memory_context
        
        if is_response and state['waiting_for_response']:
            system_prompt += f"\n\nCONTEXT: You just asked: \"{state['last_question']}\"\nUser responded: \"{message}\"\n\nNow acknowledge their response and explain the concept using their answer as context."
            state['user_responses'].append(message)
            state['waiting_for_response'] = False
        else:
            state['question_history'].append(message)
            state['waiting_for_response'] = True
            state['last_question'] = message

        # Call Groq API
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=300
        )

        ai_response = completion.choices[0].message.content
        state['last_response'] = ai_response

        # Store in Mem0
        if memory:
            try:
                memory.add(message, user_id=session_id)
                memory.add(ai_response, user_id=session_id)
            except Exception as e:
                print(f"Memory storage failed: {e}")

        return jsonify({
            'response': ai_response,
            'sessionId': session_id,
            'waitingForResponse': state['waiting_for_response'],
            'conversationState': {
                'mode': state['mode'],
                'currentTopic': state['current_topic'],
                'learningLevel': state['learning_level']
            }
        })

    except Exception as error:
        print(f"Error in /api/chat: {error}")
        return jsonify({
            'error': 'Failed to process question',
            'details': str(error)
        }), 500

@app.route('/api/synthesize-speech', methods=['POST'])
def synthesize_speech():
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Use browser TTS fallback
        return jsonify({
            'audioContent': None,
            'mimeType': 'audio/mpeg',
            'message': 'Use browser TTS'
        })

    except Exception as error:
        print(f"Speech synthesis error: {error}")
        return jsonify({
            'audioContent': None,
            'mimeType': 'audio/mpeg',
            'message': 'Using browser TTS fallback'
        })

@app.route('/api/memory/clear', methods=['POST'])
def clear_memory():
    try:
        data = request.json
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400

        if memory:
            memory.delete_all(user_id=session_id)
        
        # Clear conversation state
        if session_id in conversation_states:
            del conversation_states[session_id]
        
        return jsonify({'success': True, 'message': 'Memory cleared successfully'})
    
    except Exception as error:
        print(f"Error clearing memory: {error}")
        return jsonify({'error': 'Failed to clear memory'}), 500

@app.route('/api/rephrase', methods=['POST'])
def rephrase():
    try:
        data = request.json
        last_response = data.get('lastResponse')
        
        if not last_response or not groq_client:
            return jsonify({'error': 'Invalid request'}), 400

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Rephrase the following explanation in a different way, keeping it concise and easy to understand."},
                {"role": "user", "content": f"Rephrase: {last_response}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.8,
            max_tokens=300
        )

        return jsonify({'response': completion.choices[0].message.content})

    except Exception as error:
        return jsonify({'error': 'Failed to rephrase'}), 500

@app.route('/api/example', methods=['POST'])
def example():
    try:
        data = request.json
        last_response = data.get('lastResponse')
        
        if not last_response or not groq_client:
            return jsonify({'error': 'Invalid request'}), 400

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Provide a clear, practical example that illustrates this concept."},
                {"role": "user", "content": f"Give example for: {last_response}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=300
        )

        return jsonify({'response': completion.choices[0].message.content})

    except Exception as error:
        return jsonify({'error': 'Failed to generate example'}), 500

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'groq': bool(os.getenv('GROQ_API_KEY')),
            'mem0': bool(os.getenv('MEM0_API_KEY'))
        }
    })

@app.route('/')
def serve_frontend():
    return send_from_directory('public', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('public', filename)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    print(f"🚀 VoiceTutor Python running on http://localhost:{port}")
    print(f"📊 Health check: http://localhost:{port}/api/health")
    
    if not os.getenv('GROQ_API_KEY'):
        print('⚠️  GROQ_API_KEY not found. AI responses will not work.')
    
    if not os.getenv('MEM0_API_KEY'):
        print('⚠️  MEM0_API_KEY not found. Memory features disabled.')
    else:
        print('✅ Mem0 API key found')
    
    app.run(host='0.0.0.0', port=port, debug=True)
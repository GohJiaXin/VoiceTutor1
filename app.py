'''
    Main Flask app, route definitions, Groq tool handling
'''

import os
import json
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests # Still needed for local service calls and memory curation

# Third-party Libraries
from groq import Groq
from mem0 import Memory

# Import service functions from the new directory
from services.elevenlabs_tts import synthesize_speech
from services.fal_ai_generator import generate_visual_aid

# --- Configuration and Initialization ---
load_dotenv()

app = Flask(__name__, static_folder='public')
CORS(app) # Enable CORS for frontend

# --- API Key Checks ---
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
MEM0_API_KEY = os.getenv('MEM0_API_KEY')

groq_client = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
else:
    print("WARNING: GROQ_API_KEY not found. AI features will be disabled.")

memory = None
if MEM0_API_KEY:
    try:
        print(f"Attempting to initialize Memory with MEM0_API_KEY: {MEM0_API_KEY[:10]}...")
        print(f"OpenAI API Key available: {bool(os.getenv('OPENAI_API_KEY'))}")
        
        # Try different initialization methods
        try:
            # Method 1: Default initialization
            memory = Memory()
            print("Memory service initialized successfully with default config.")
        except Exception as e1:
            print(f"Default init failed: {e1}")
            try:
                # Method 2: With explicit config
                config = {
                    "vector_store": {
                        "provider": "qdrant",
                        "config": {
                            "collection_name": "voicetutor",
                            "host": "localhost",
                            "port": 6333
                        }
                    }
                }
                memory = Memory.from_config(config)
                print("Memory service initialized with custom config.")
            except Exception as e2:
                print(f"Custom config init failed: {e2}")
                # Method 3: Disable memory for now
                memory = None
                print("Memory initialization failed completely. Continuing without memory.")
                
    except Exception as e:
        print(f"WARNING: Memory initialization failed: {e}. Memory features will be disabled.")
        memory = None
else:
    print("WARNING: MEM0_API_KEY not found. Memory features will be disabled.")


# Conversation State Management
conversation_states = {}

# --- AI Tool Definition (for Groq) ---
VISUAL_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_visual_aid",
        "description": "Call this to generate a diagram, graph, or analogy image for a user when explaining a complex concept for the first time or when requested.",
        "parameters": {
            "type": "object",
            "properties": {
                "concept_text": {
                    "type": "string",
                    "description": "The exact explanation text the image should illustrate. Must be a complete, clear sentence from the AI's explanation."
                }
            },
            "required": ["concept_text"]
        }
    }
}

# --- System Prompts (Tailored for Interactive Tutoring) ---
SYSTEM_PROMPT_INTERACTIVE = """
You are VoiceTutor, an enthusiastic, expert AI study assistant designed for voice-first interaction.
Your persona is a friendly, Socratic dialogue partner.
GOAL: Explain concepts clearly, then immediately ask a thought-provoking, specific question to assess user understanding or deepen the conversation.
STYLE GUIDE:
1. Speak naturally, acknowledging previous user input.
2. Use analogies to simplify complex topics.
3. Your final sentence must always be a question or a challenge.
4. **DO NOT** use phrases like "Does this make sense?" or "Do you understand?". Ask a direct question about the material, for example: "How might the lack of chlorophyll impact a plant's energy source?"

Available Tools:
- You have the ability to generate a visual aid using the 'generate_visual_aid' tool.
- Use this tool when you introduce a complex topic and believe a visual diagram or analogy would significantly aid understanding.
"""


# --- Utility Functions ---

def get_conversation_state(session_id):
    """Retrieves or initializes the state for a given session."""
    if session_id not in conversation_states:
        conversation_states[session_id] = {
            'level': 'beginner',
            'history': [],
            'waiting_for_response': False,
            'last_question': None,
            'last_response': None,
            'user_responses': []
        }
    return conversation_states[session_id]

def update_system_prompt(state, message):
    """Dynamically updates the system prompt based on conversation flow."""
    current_prompt = SYSTEM_PROMPT_INTERACTIVE
    
    # 1. Add Memory Context
    relevant_memories = ""
    if memory:
        try:
            # Search memory for relevant past learning points
            search_results = memory.search(message, user_id=state['history'][0].get('id', 'default_user'))
            if search_results:
                memory_texts = [res['data'] for res in search_results]
                relevant_memories = "\nRELEVANT MEMORIES (User's Past Learning Points):\n" + "\n".join(memory_texts)
        except Exception as e:
            print(f"Memory search failed: {e}")
    else:
        print("Skipping memory search - memory service not available")

    # 2. Add Context for back-to-back dialogue
    dialogue_context = ""
    if state['waiting_for_response'] and state['last_question']:
        # If the user is responding to the AI's previous question
        dialogue_context = (
            f"\n\nUSER'S TASK: The user is now responding to your previous question. "
            f"Your LAST QUESTION WAS: '{state['last_question']}'. "
            f"The user's CURRENT MESSAGE is their answer. "
            f"Acknowledge their answer, correct or elaborate as necessary, and then continue the Socratic dialogue with a new, related question."
        )
        state['waiting_for_response'] = False # Reset flag after using context
    else:
        # User is starting a new topic or asking a new question
        state['waiting_for_response'] = True
        dialogue_context = "\n\nUSER'S TASK: The user is asking a new question or continuing the topic. Provide a comprehensive explanation followed by a new, specific question."


    return current_prompt + dialogue_context + relevant_memories


# --- API Endpoints ---

@app.route('/api/chat', methods=['POST'])
def chat():
    if not groq_client:
        return jsonify({'error': 'AI services not configured.'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        message = data.get('message', '')
        session_id = data.get('sessionId', 'default_session')
        
        state = get_conversation_state(session_id)
        
        # 1. Update System Prompt with Memory and Dialogue Context
        system_prompt = update_system_prompt(state, message)
        
        # 2. Prepare Messages and Call Groq
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=350,
            tools=[VISUAL_TOOL]
        )

        ai_response = completion.choices[0].message.content
        image_url = None
        
        # 3. Handle Tool Call (Visual Generation)
        print(f"Finish reason: {completion.choices[0].finish_reason}")
        print(f"Has tool calls: {hasattr(completion.choices[0].message, 'tool_calls') and completion.choices[0].message.tool_calls}")
        
        if completion.choices[0].finish_reason == "tool_calls" and completion.choices[0].message.tool_calls:
            tool_call = completion.choices[0].message.tool_calls[0]
            print(f"Tool call detected: {tool_call.function.name}")
            if tool_call.function.name == "generate_visual_aid":
                
                concept_text = json.loads(tool_call.function.arguments)['concept_text']
                print(f"Generating visual for: {concept_text}")
                
                # Use the imported service function
                image_url, prompt_used_or_error = generate_visual_aid(groq_client, concept_text)
                
                print(f"Visual generation result: image_url={image_url}")
                
                if image_url:
                    ai_response = f"Here is the explanation, and I've generated a visual aid to help you understand this concept: {concept_text}"
                    print(f"SUCCESS: Image will be sent to frontend: {image_url}")
                else:
                    ai_response = f"I tried to generate a visual, but the service failed. Here is the explanation: {concept_text}"
                    print(f"FAILED: Visual generation failed: {prompt_used_or_error}")
        elif ai_response and "<function=generate_visual_aid>" in ai_response:
            print("Function call found in text response, processing...")
            import re
            match = re.search(r'<function=generate_visual_aid>\{"concept_text":\s*"([^"]+)"\}', ai_response)
            if match:
                concept_text = match.group(1)
                print(f"Extracted concept from text: {concept_text}")
                
                image_url, prompt_used_or_error = generate_visual_aid(groq_client, concept_text)
                
                if image_url:
                    ai_response = re.sub(r'<function=generate_visual_aid>.*?>', '', ai_response)
                    ai_response = f"Here's an explanation with a visual aid: {concept_text}. {ai_response}"
                    print(f"SUCCESS: Generated image from text: {image_url}")
                else:
                    ai_response = re.sub(r'<function=generate_visual_aid>.*?>', '', ai_response)
                    print(f"FAILED: Visual generation failed: {prompt_used_or_error}")
        
        # 4. Save State, Memory, and Prepare Response
        
        # Check if the AI's response is a question (for next turn's context)
        if state['waiting_for_response'] and ai_response.strip().endswith('?'):
            state['last_question'] = ai_response
        else:
            state['last_question'] = None
            state['waiting_for_response'] = False

        state['last_response'] = ai_response
        state['history'].append({'role': 'user', 'content': message})
        state['history'].append({'role': 'assistant', 'content': ai_response})

        # --- Memory Curation (Skip if memory not available) ---
        if memory and ai_response:
            try:
                # Ask Groq to summarize the key learning point (lightweight, low temp)
                summary_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "Condense the following explanation into a single, succinct knowledge sentence for long-term memory storage."},
                        {"role": "user", "content": ai_response}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.1,
                    max_tokens=50
                )
                curated_memory = summary_completion.choices[0].message.content
                
                # Store the curated point
                memory.add(curated_memory, user_id=session_id, metadata={"type": "learning_point"})
                print(f"Memory stored: {curated_memory[:50]}...")
                
            except Exception as e:
                print(f"Memory curation failed: {e}")
        elif not memory:
            print("Skipping memory storage - memory service not available")

        response_data = {
            'response': ai_response,
            'sessionId': session_id,
            'imageUrl': image_url,
            'waitingForResponse': state['waiting_for_response'],
            'conversationState': state
        }
        print(f"Final response: AI={ai_response[:100]}..., Image={image_url}")
        print(f"Sending to frontend: imageUrl={image_url}")
        return jsonify(response_data)

    except Exception as error:
        print(f"Chat error: {error}")
        return jsonify({'error': f'An unexpected error occurred: {error}'}), 500


@app.route('/api/synthesize-speech', methods=['POST'])
def api_synthesize_speech():
    """Endpoint for TTS, using the imported ElevenLabs service function."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Use the imported service function
        audio_content, mime_type, message = synthesize_speech(text)
        
        return jsonify({
            'audioContent': audio_content, 
            'mimeType': mime_type, 
            'message': message
        })

    except Exception as error:
        print(f"Speech synthesis error: {error}")
        return jsonify({'audioContent': None, 'mimeType': 'audio/mpeg', 'message': 'TTS exception, falling back to browser TTS'}), 500


# --- Utility Endpoints ---

@app.route('/api/memory/clear', methods=['POST'])
def clear_memory():
    if not memory:
        return jsonify({'message': 'Memory service not configured. Session reset locally.'}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
            
        session_id = data.get('sessionId', 'default_session')
        
        # Delete from Mem0
        memory.delete_all(user_id=session_id)
        
        # Delete from local state
        if session_id in conversation_states:
            del conversation_states[session_id]

        return jsonify({'message': f'Conversation memory and state cleared for session {session_id}.'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to clear memory: {e}'}), 500

@app.route('/api/health')
def health_check():
    """Simple health check endpoint."""
    return jsonify({
        'status': 'ok',
        'timestamp': int(os.environ.get('PORT', 3000)),
        'groq_configured': bool(GROQ_API_KEY),
        'mem0_configured': bool(MEM0_API_KEY),
        'memory_active': bool(memory),
        'elevenlabs_configured': bool(os.getenv('ELEVENLABS_API_KEY')),
        'fal_ai_configured': bool(os.getenv('FAL_AI_API_KEY'))
    })

@app.route('/api/memory/status/<session_id>')
def memory_status(session_id):
    """Check memory status for a session."""
    if not memory:
        return jsonify({
            'memory_available': False,
            'message': 'Memory service not available - app running without persistent memory',
            'session_id': session_id
        })
    
    try:
        # Get all memories for this user
        memories = memory.get_all(user_id=session_id)
        return jsonify({
            'memory_available': True,
            'memory_count': len(memories) if memories else 0,
            'memories': memories[:5] if memories else [],  # Show first 5
            'session_id': session_id
        })
    except Exception as e:
        return jsonify({
            'memory_available': False,
            'error': f'Memory check failed: {e}',
            'session_id': session_id
        }), 500

# --- Frontend Serving ---

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    # Default to 3000 if not specified
    port = int(os.environ.get('PORT', 3000)) 
    # Use a secure way to run in production, but for development:
    app.run(debug=True, port=port)
'''
    Minimal entry point to start the Flask app
'''

# voicetutor/run.py

from app import app
import os
from dotenv import load_dotenv

# Load environment variables from .env if not loaded in app.py
load_dotenv() 

if __name__ == '__main__':
    # Get port from environment variables, defaulting to 3000
    port = int(os.environ.get('PORT', 3000)) 
    
    print(f"🚀 Starting VoiceTutor server on http://localhost:{port}")
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=port)
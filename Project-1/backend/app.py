from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize the Gemini model
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-3-flash-preview')

# Store conversation history for context
conversation_history = []

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Endpoint to send a message to the chatbot and get a response.
    """
    try:
        data = request.json
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Build conversation context from history (last 10 messages for context window)
        context = "\n".join([f"{item['role']}: {item['parts']}" for item in conversation_history[-10:]])
        prompt = f"{context}\nuser: {user_message}" if context else user_message
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        bot_response = response.text
        
        # Add messages to history
        conversation_history.append({
            "role": "user",
            "parts": user_message
        })
        conversation_history.append({
            "role": "model",
            "parts": bot_response
        })
        
        return jsonify({
            'success': True,
            'message': user_message,
            'response': bot_response
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clear-history', methods=['POST'])
def clear_history():
    """
    Endpoint to clear conversation history.
    """
    global conversation_history
    conversation_history = []
    return jsonify({'success': True, 'message': 'Conversation history cleared'}), 200

@app.route('/api/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    """
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

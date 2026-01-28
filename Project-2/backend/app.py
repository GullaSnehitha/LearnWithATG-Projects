from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Chat, token_required
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://localhost/amzur_chats')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False

# Initialize Extensions
db.init_app(app)
CORS(app)

# Initialize Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-3-flash-preview')

JWT_SECRET = os.getenv('JWT_SECRET', 'default_secret_key')
AMZUR_EMAIL_DOMAIN = os.getenv('AMZUR_EMAIL_DOMAIN', 'amzur.com')


# ==================== Authentication Routes ====================

@app.route('/api/register', methods=['POST'])
def register():
    """
    Register a new Amzur employee.
    Requires: employee_id, email, password, name
    Email must be from amzur.com domain
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['employee_id', 'email', 'password', 'name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data.get('email').lower()
        employee_id = data.get('employee_id')
        password = data.get('password')
        name = data.get('name')
        
        # Validate Amzur email
        if not email.endswith(f'@{AMZUR_EMAIL_DOMAIN}'):
            return jsonify({
                'error': f'Email must be from {AMZUR_EMAIL_DOMAIN} domain'
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(employee_id=employee_id).first():
            return jsonify({'error': 'Employee ID already registered'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        new_user = User(
            employee_id=employee_id,
            email=email,
            password_hash=password_hash,
            name=name
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Generate token
        token = new_user.generate_token(JWT_SECRET)
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': new_user.to_dict(),
            'token': token
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """
    Login an Amzur employee.
    Requires: email, password
    """
    try:
        data = request.json
        
        email = data.get('email', '').lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token
        token = user.generate_token(JWT_SECRET)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': token
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Chat Routes ====================

@app.route('/api/chat', methods=['POST'])
@token_required
def chat(current_user):
    """
    Send a message to the chatbot and store in database.
    Requires: Authorization header with valid token
    Body: { message: "user message" }
    """
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get user's last 10 messages for context
        recent_chats = Chat.query.filter_by(user_id=current_user.id) \
            .order_by(Chat.created_at.desc()).limit(10).all()
        
        # Build conversation context
        context = ""
        for chat in reversed(recent_chats):
            context += f"User: {chat.message}\nBot: {chat.response}\n"
        
        prompt = f"{context}\nUser: {user_message}" if context else user_message
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        bot_response = response.text
        
        # Store chat in database
        new_chat = Chat(
            user_id=current_user.id,
            message=user_message,
            response=bot_response
        )
        
        db.session.add(new_chat)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': user_message,
            'response': bot_response,
            'chat_id': new_chat.id,
            'timestamp': new_chat.created_at.isoformat()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/chats', methods=['GET'])
@token_required
def get_chats(current_user):
    """
    Get all chats for the logged-in user.
    Requires: Authorization header with valid token
    """
    try:
        chats = Chat.query.filter_by(user_id=current_user.id) \
            .order_by(Chat.created_at.asc()).all()
        
        return jsonify({
            'success': True,
            'chats': [chat.to_dict() for chat in chats]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
@token_required
def delete_chat(current_user, chat_id):
    """
    Delete a specific chat message.
    Requires: Authorization header with valid token
    """
    try:
        chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
        
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        db.session.delete(chat)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Chat deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/chats/clear', methods=['POST'])
@token_required
def clear_chats(current_user):
    """
    Clear all chats for the logged-in user.
    Requires: Authorization header with valid token
    """
    try:
        Chat.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'All chats cleared successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    """
    Get current user information.
    Requires: Authorization header with valid token
    """
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    }), 200


# ==================== Health Check ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


# ==================== Database Initialization ====================

@app.route('/api/init-db', methods=['POST'])
def init_db():
    """Initialize the database tables"""
    try:
        with app.app_context():
            db.create_all()
        return jsonify({
            'success': True,
            'message': 'Database tables created successfully'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5001)

# Gemini Chatbot - Project 1

A chatbot application integrating Google's Gemini API with a Flask backend and vanilla JavaScript frontend.

## Features

- Real-time chat with Gemini 3 Flash Preview
- Conversation history management
- CORS-enabled REST API
- Simple, responsive UI

## Tech Stack

**Backend:** Flask, Google Generative AI, Flask-CORS, python-dotenv
**Frontend:** HTML5, CSS3, JavaScript

## Setup

### Backend
```bash
cd backend
copy .env.example .env
# Add your Gemini API key to .env
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
python -m http.server 8000
```

Access the chatbot at `http://localhost:8000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get response |
| POST | `/api/clear-history` | Clear conversation history |
| GET | `/api/health` | Health check |

## Troubleshooting

- **Connection refused:** Ensure backend is running on port 5000
- **API key error:** Verify `.env` file contains valid Gemini API key
- **Module not found:** Run `pip install -r requirements.txt`

## Notes

- Conversation history stored in-memory (resets on server restart)
- Gemini 3 Flash Preview model used

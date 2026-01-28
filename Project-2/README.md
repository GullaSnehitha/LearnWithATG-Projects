Project 2: AI Chat Application with PostgreSQL

Overview

A secure, employee-based chat application that allows authenticated users to interact with Google Gemini AI while maintaining persistent chat history using a PostgreSQL database.
Designed for internal employee usage with strict account uniqueness and secure authentication.

Key Features

- Employee registration & login (@amzur.com email only)
- One account per employee (unique email & employee ID)
- Chat with Google Gemini AI
- Persistent chat history stored in PostgreSQL
- Delete individual chats or clear entire history
- JWT-based authentication
- Responsive UI (desktop, tablet, mobile)

Tech Stack

Frontend: HTML, CSS, JavaScript
Backend: Python (Flask)
Database: PostgreSQL
Authentication: JWT (JSON Web Tokens)
LLM Integration: Google Gemini AI

Getting Started (Local Setup)
Install dependencies
- pip install -r requirements.txt

Configure environment variables

- Create a .env file and add:
-- Database connection string
-- Gemini API key
-- JWT secret

Start backend server
- python app.py

Start frontend
- python -m http.server

Authentication Rules

- Only employees with @amzur.com email can register
- Each employee can create only one account
- Duplicate employee IDs or emails are rejected at both application level and database level (unique constraints)

Design Notes

- Backend enforces all critical validations (not frontend)
- Database-level constraints prevent duplicate accounts
- Stateless REST APIs are used
- JWT tokens secure all protected endpoints

Project Structure
Project-2/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── index.html
│   ├── chat.html
│   ├── auth.js
│   ├── chat.js
│   └── styles.css
└── README.md

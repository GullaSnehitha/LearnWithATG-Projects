const API_URL = 'http://localhost:5001/api';

let currentUser = null;
let token = null;
let allChats = [];
let currentChatSession = [];

// ==================== Initialization ====================

window.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        // Redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    displayUserInfo();
    loadChatHistory();
    setupEventListeners();
});

// Display user information
function displayUserInfo() {
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('clearChatBtn').addEventListener('click', clearCurrentChat);
    document.getElementById('newChatBtn').addEventListener('click', startNewChat);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ==================== Load Chat History ====================

async function loadChatHistory() {
    const modal = document.getElementById('loadingModal');
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_URL}/chats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        modal.style.display = 'none';
        
        if (!response.ok) {
            showError(`Failed to load chats: ${data.error}`);
            return;
        }
        
        allChats = data.chats || [];
        displayChatHistory();
        
        // Don't display all chats on initial load - just show welcome message
        // User will click on a specific chat to view it
        
    } catch (error) {
        modal.style.display = 'none';
        showError(`Error loading chats: ${error.message}`);
    }
}

// Display chat history in sidebar
function displayChatHistory() {
    const historyList = document.getElementById('chatHistoryList');
    
    if (allChats.length === 0) {
        historyList.innerHTML = '<p class="empty-message">No chats yet</p>';
        return;
    }
    
    historyList.innerHTML = '';
    
    // Group chats by date and display last message from each session
    const sessions = {};
    
    allChats.forEach(chat => {
        const date = new Date(chat.created_at).toLocaleDateString();
        if (!sessions[date]) {
            sessions[date] = [];
        }
        sessions[date].push(chat);
    });
    
    // Display recent chats (last 10)
    const recentChats = allChats.slice(-10).reverse();
    
    recentChats.forEach((chat, index) => {
        const chatItem = document.createElement('div');
        chatItem.className = 'history-item';
        
        const preview = chat.message.substring(0, 40);
        const time = new Date(chat.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        chatItem.innerHTML = `
            <div class="history-item-content">
                <p class="history-item-text">${preview}...</p>
                <span class="history-item-time">${time}</span>
            </div>
            <button class="history-delete-btn" data-chat-id="${chat.id}" title="Delete">×</button>
        `;
        
        chatItem.querySelector('.history-item-content').addEventListener('click', () => {
            displaySpecificChat(chat.id);
        });
        
        chatItem.querySelector('.history-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        historyList.appendChild(chatItem);
    });
}

// Display all loaded chats in the chat window
function displayLoadedChats() {
    clearWelcomeMessage();
    
    allChats.forEach(chat => {
        const messageDiv = createMessageElement(chat.message, 'user');
        document.getElementById('chatBox').appendChild(messageDiv);
        
        const responseDiv = createMessageElement(chat.response, 'bot');
        document.getElementById('chatBox').appendChild(responseDiv);
    });
    
    scrollToBottom();
}

// Display specific chat session
function displaySpecificChat(chatId) {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = ''; // Clear chat window
    clearWelcomeMessage();
    
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
        const messageDiv = createMessageElement(chat.message, 'user');
        chatBox.appendChild(messageDiv);
        
        const responseDiv = createMessageElement(chat.response, 'bot');
        chatBox.appendChild(responseDiv);
        
        scrollToBottom();
    }
}

// ==================== Chat Functions ====================

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    clearWelcomeMessage();
    
    // Add user message to display
    displayChatMessage(message, 'user');
    messageInput.value = '';
    document.getElementById('sendBtn').disabled = true;
    
    // Add loading indicator
    addLoadingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });
        
        removeLoadingIndicator();
        
        const data = await response.json();
        
        if (!response.ok) {
            displayChatMessage(`Error: ${data.error}`, 'bot');
        } else {
            displayChatMessage(data.response, 'bot');
            
            // Add to local chats array
            allChats.push({
                id: data.chat_id,
                message: message,
                response: data.response,
                created_at: data.timestamp
            });
            
            // Update history
            displayChatHistory();
        }
    } catch (error) {
        removeLoadingIndicator();
        displayChatMessage(`Error: ${error.message}`, 'bot');
    } finally {
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').focus();
    }
}

// Display a chat message
function displayChatMessage(text, sender) {
    const messageDiv = createMessageElement(text, sender);
    document.getElementById('chatBox').appendChild(messageDiv);
    scrollToBottom();
}

// Create message element
function createMessageElement(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

// Clear welcome message
function clearWelcomeMessage() {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
}

// Add loading indicator
function addLoadingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.id = 'loading-indicator';
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'loading';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        loadingContent.appendChild(dot);
    }
    
    messageDiv.appendChild(loadingContent);
    document.getElementById('chatBox').appendChild(messageDiv);
    scrollToBottom();
}

// Remove loading indicator
function removeLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==================== Chat Management ====================

async function clearCurrentChat() {
    if (!confirm('Are you sure you want to clear all chats? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/chats/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(`Failed to clear chats: ${data.error}`);
            return;
        }
        
        allChats = [];
        document.getElementById('chatBox').innerHTML = `
            <div class="welcome-message">
                <h2>Chat Cleared</h2>
                <p>Start a new conversation with Gemini AI.</p>
            </div>
        `;
        displayChatHistory();
        
    } catch (error) {
        showError(`Error clearing chats: ${error.message}`);
    }
}

async function deleteChat(chatId) {
    if (!confirm('Delete this chat?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            showError('Failed to delete chat');
            return;
        }
        
        // Remove from local array
        allChats = allChats.filter(chat => chat.id !== chatId);
        displayChatHistory();
        
    } catch (error) {
        showError(`Error deleting chat: ${error.message}`);
    }
}

function startNewChat() {
    document.getElementById('chatBox').innerHTML = `
        <div class="welcome-message">
            <h2>New Chat</h2>
            <p>Start a conversation with Gemini AI.</p>
            <div class="feature-list">
                <p>✓ Your chats are automatically saved</p>
                <p>✓ Access them anytime from the sidebar</p>
                <p>✓ Build on previous conversations</p>
            </div>
        </div>
    `;
    document.getElementById('messageInput').focus();
}

// ==================== Authentication ====================

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// Show error message
function showError(message) {
    alert(message);
}

const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatBox = document.getElementById('chatBox');
const clearBtn = document.getElementById('clearBtn');

const API_URL = 'http://localhost:5000/api';

// Function to add a message to the chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to add loading indicator
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
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to remove loading indicator
function removeLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Function to clear welcome message
function clearWelcomeMessage() {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
}

// Function to send message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Clear welcome message on first message
    clearWelcomeMessage();
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    
    // Add loading indicator
    addLoadingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        removeLoadingIndicator();
        
        if (!response.ok) {
            const error = await response.json();
            addMessage(`Error: ${error.error || 'Failed to get response'}`, 'bot');
        } else {
            const data = await response.json();
            addMessage(data.response, 'bot');
        }
    } catch (error) {
        removeLoadingIndicator();
        addMessage(`Error: ${error.message}. Make sure the backend server is running on http://localhost:5000`, 'bot');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Function to clear history
async function clearHistory() {
    try {
        const response = await fetch(`${API_URL}/clear-history`, {
            method: 'POST',
        });
        
        if (response.ok) {
            chatBox.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to Gemini Chatbot!</h2>
                    <p>Ask me anything and I'll help you with an answer.</p>
                </div>
            `;
            messageInput.value = '';
        }
    } catch (error) {
        alert(`Error clearing history: ${error.message}`);
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
clearBtn.addEventListener('click', clearHistory);

// Focus on input when page loads
messageInput.focus();

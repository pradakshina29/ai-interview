import React, { useState, useEffect, useRef } from 'react';
import './ChatbotWidget.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'coach',
      text: "Hello! 🤖 I am your AI Career Coach. I'm here to help you practice interviews, answer job search questions, and master your career path! How can I help you succeed today? 🚀",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add User Message
    const userMsgObj = {
      sender: 'user',
      text: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsgObj]);
    setLoading(true);

    try {
      // Map messages for Gemini history context (keeping last 6 messages to prevent token bloat)
      const chatHistory = messages.slice(-6).map(m => ({
        sender: m.sender === 'coach' ? 'model' : 'user',
        text: m.text
      }));

      const res = await fetch(`${API}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: chatHistory }),
      });

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        sender: 'coach',
        text: data.reply || "I'm sorry, I encountered a brief issue! Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [...prev, {
        sender: 'coach',
        text: "Oh no! 🤖 I'm having trouble connecting to my brain right now. Please try again in a moment! ⚡",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`chatbot-widget ${isOpen ? 'widget-open' : ''}`}>
      {/* Floating Action Button */}
      <button 
        className="chatbot-fab" 
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with AI Career Coach"
        aria-label="Toggle AI Career Coach"
      >
        <span className="fab-icon">{isOpen ? '❌' : '🤖'}</span>
        {!isOpen && <span className="fab-badge">AI Helper</span>}
      </button>

      {/* Glassmorphic Chat Window */}
      {isOpen && (
        <div className="chatbot-window animate-fade-in-up">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar">🤖</div>
            <div>
              <h4>AI Career Coach</h4>
              <p>🟢 Online & ready to help</p>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.sender === 'user' ? 'msg-user' : 'msg-coach'}`}>
                <div className="msg-bubble">
                  <p>{m.text}</p>
                  <span className="msg-time">{m.time}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message msg-coach msg-loading">
                <div className="msg-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask me anything about interview prep..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? '...' : '✈️'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

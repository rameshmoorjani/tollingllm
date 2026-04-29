import React from 'react'
import '../styles/ChatWindow.css'

interface Message {
  id: string
  role: 'user' | 'agent'
  message: string
  timestamp: Date
  metadata?: any
  isError?: boolean
}

interface ChatWindowProps {
  messages: Message[]
  loading: boolean
  onSend: () => void
  inputValue: string
  onInputChange: (value: string) => void
  customerId: string
}

function ChatWindow({
  messages,
  loading,
  onSend,
  inputValue,
  onInputChange,
  customerId,
}: ChatWindowProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    console.log('🔄 ChatWindow - messages changed:', messages.length, messages)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 && !customerId && (
          <div className="empty-state">
            <p>👋 Welcome to TollingLLM Chat Agent</p>
            <p>Select a customer ID and ask for a summary</p>
          </div>
        )}

        {messages.length === 0 && customerId && (
          <div className="empty-state">
            <p>💬 No messages yet</p>
            <p>Start a conversation with the AI agent</p>
          </div>
        )}

        {messages.map((msg) => {
          console.log('🎨 Rendering message:', msg.id, msg.role, msg.message.substring(0, 50))
          return (
            <div 
              key={msg.id} 
              className={`message ${msg.role}${msg.isError ? ' error' : ''}`}
            >
              <div className="message-content">
                {msg.role === 'user' ? '👤' : '🤖'} {msg.message}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="message agent">
            <div className="message-content">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Ask the agent about tolling transactions..."
          disabled={!customerId || loading}
          rows={3}
        />
        <button onClick={onSend} disabled={!customerId || loading} className="btn-send">
          {loading ? '⏳ Sending...' : '📤 Send'}
        </button>
      </div>
    </div>
  )
}

export default ChatWindow

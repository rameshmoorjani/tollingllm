import React, { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import ChatWindow from '../components/ChatWindow'
import '../styles/Agent.css'

const apiBaseUrl = (window as any).APP_CONFIG?.API_BASE_URL || 'http://localhost:5000'

function AgentScreen() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const newSocket = io(apiBaseUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('✅ Connected to WebSocket', apiBaseUrl)

      // Create new session
      newSocket.emit('join_chat', { session_id: undefined })
    })

    newSocket.on('session_created', (data) => {
      setSessionId(data.session_id)
    })

    newSocket.on('message_received', (data) => {
      console.log('Message received:', data)
    })

    newSocket.on('agent_chunk', (data) => {
      setMessages((prev) => {
        // Find or create the agent response message
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'agent') {
          // Append chunk to existing agent message
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              message: lastMsg.message + data.chunk,
            },
          ]
        }
        // Create new agent message if none exists
        return [
          ...prev,
          {
            id: 'temp',
            role: 'agent',
            message: data.chunk,
            timestamp: new Date(),
          },
        ]
      })
    })

    newSocket.on('agent_complete', (data) => {
      console.log('🎯 Agent response complete:', data)
      setMessages((prev) => {
        console.log('📋 Current messages array:', prev)
        const updated = prev.map((msg) => {
          if (msg.role === 'agent' && msg.id === 'temp') {
            console.log('✅ Found temp agent message, replacing...')
            return {
              ...msg,
              id: data.message_id,
              message: data.message,
              metadata: data.metadata,
            }
          }
          return msg
        })
        console.log('📊 Updated messages array:', updated)
        console.log('📊 Updated array length:', updated.length)
        updated.forEach((msg, idx) => {
          console.log(`  [${idx}] role=${msg.role}, id=${msg.id}, message.length=${msg.message?.length || 0}`)
        })
        return updated
      })
      setLoading(false)
      console.log('✅ Loading set to false')
    })

    newSocket.on('error', (data) => {
      const errorMsg = data.message || 'An error occurred while processing your query'
      console.error('Error:', data)
      setError(errorMsg)
      setLoading(false)
      // Show error in messages
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          message: `❌ Error: ${errorMsg}`,
          timestamp: new Date(),
          isError: true,
        },
      ])
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('❌ Disconnected from WebSocket')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const handleSendQuery = () => {
    if (!customerId.trim() || !inputValue.trim() || !socket) {
      alert('Please select a customer/mode and enter a message')
      return
    }

    // Clear previous error
    setError(null)

    // Create both messages at once to avoid batching issues
    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      message: inputValue,
      timestamp: new Date(),
    }

    const placeholderMsg = {
      id: 'temp',
      role: 'agent' as const,
      message: '',
      timestamp: new Date(),
    }

    // Add both messages in a single state update
    setMessages((prev) => [...prev, userMsg, placeholderMsg])

    setLoading(true)
    socket.emit('send_query', {
      session_id: sessionId,
      customer_id: customerId,
      message: inputValue,
    })

    setInputValue('')
  }

  const handleClearChat = () => {
    setMessages([])
    if (socket) {
      socket.emit('clear_chat', { session_id: sessionId })
    }
  }

  return (
    <div className="agent-screen">
      <div className="agent-header">
        <h2>💬 Chat Agent - Tolling Summary</h2>
        <p>Ask the AI agent for tolling transaction summaries</p>
        {connected && <span className="status-badge">🟢 Connected</span>}
        {!connected && <span className="status-badge">🔴 Disconnected</span>}
      </div>

      <div className="agent-container">
        <div className="chat-sidebar">
          <div className="customer-input">
            <label>Select Customer or Analysis Mode</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendQuery()}
            >
              <option value="">-- Choose Customer --</option>
              <option value="ALL">🔍 ALL CUSTOMERS (Cross-Customer Analysis)</option>
              <option value="CUST001">CUST001</option>
              <option value="CUST002">CUST002</option>
              <option value="CUST003">CUST003</option>
              <option value="CUST004">CUST004 (Maximum Total: $480)</option>
              <option value="CUST005">CUST005 (Total: $420)</option>
              <option value="CUST006">CUST006</option>
              <option value="CUST007">CUST007</option>
              <option value="CUST008">CUST008</option>
              <option value="CUST009">CUST009</option>
              <option value="CUST010">CUST010</option>
              <option value="CUST011">CUST011 (Test Customer: $22.50)</option>
            </select>
          </div>

          <div className="quick-actions">
            <h4>Quick Examples</h4>
            <button
              onClick={() => setInputValue('Summarize my tolling transactions')}
              className="quick-btn"
            >
              📊 Summarize All
            </button>
            <button
              onClick={() =>
                setInputValue('What is the total toll amount I paid last month?')
              }
              className="quick-btn"
            >
              💰 Total Amount
            </button>
            <button
              onClick={() => setInputValue('Which customer paid the most?')}
              className="quick-btn"
            >
              👑 Top Customer
            </button>
            <button
              onClick={() => setInputValue('What is the highest toll amount paid by any customer?')}
              className="quick-btn"
            >
              💎 Max Toll
            </button>
          </div>

          <button onClick={handleClearChat} className="btn-clear">
            🗑️ Clear Chat
          </button>
        </div>

        <div className="chat-main">
          <ChatWindow
            messages={messages}
            loading={loading}
            onSend={handleSendQuery}
            inputValue={inputValue}
            onInputChange={setInputValue}
            customerId={customerId}
          />
        </div>
      </div>
    </div>
  )
}

export default AgentScreen

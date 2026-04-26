import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import BrowseScreen from './pages/Browse'
import AgentScreen from './pages/Agent'
import './styles/App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'browse' | 'agent'>('browse')

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>🚗 TollingLLM</h1>
            <p>AI-Powered Tolling Transaction Summarization</p>
          </div>
          <ul className="nav-links">
            <li>
              <Link
                to="/browse"
                className={activeTab === 'browse' ? 'active' : ''}
                onClick={() => setActiveTab('browse')}
              >
                📊 Browse Data
              </Link>
            </li>
            <li>
              <Link
                to="/agent"
                className={activeTab === 'agent' ? 'active' : ''}
                onClick={() => setActiveTab('agent')}
              >
                💬 Chat Agent
              </Link>
            </li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/browse" element={<BrowseScreen />} />
            <Route path="/agent" element={<AgentScreen />} />
            <Route path="/" element={<BrowseScreen />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

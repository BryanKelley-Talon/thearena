import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { mountSandboxTag } from './sandbox-tag.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Shows only on a *.workers.dev address (the sandbox); does nothing on flashpointhistory.com.
mountSandboxTag()

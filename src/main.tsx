import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { PlatformProvider } from './state/PlatformContext'
import { WorkspaceProvider } from './state/WorkspaceContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <PlatformProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </PlatformProvider>
    </HashRouter>
  </React.StrictMode>,
)

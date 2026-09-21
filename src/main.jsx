import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import GardeErreur from './components/GardeErreur'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <GardeErreur>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GardeErreur>
    </BrowserRouter>
  </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import './index.css'
import 'leaflet/dist/leaflet.css'
import './styles/clinical.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

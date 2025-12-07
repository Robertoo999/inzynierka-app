import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import LoadingIndicator from './components/LoadingIndicator'
import { ToastProvider } from './components/Toasts'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <App />
                <LoadingIndicator />
            </ToastProvider>
        </BrowserRouter>
    </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/viewport'            // measures the real screen first, so the first paint is already the right size
import './styles/theme.css'
import App from './App'
import { ThemeProvider, applyInitialTheme } from './context/ThemeContext'
import { I18nProvider, applyInitialLanguage } from './i18n'

// Before React renders: <html data-theme>, <html lang> and <html dir> (rtl for Arabic and Urdu)
applyInitialTheme()
applyInitialLanguage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@/lib/gsap'
import App from './App.tsx'
import { applyLook, useLook } from './store/look'

// Apply the saved look before the first paint so there is no theme flash.
applyLook(useLook.getState())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

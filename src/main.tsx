import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'
import { captureEditTokenFromUrl } from './lib/tripAccess'
import { EditAccessProvider } from './lib/editAccessContext'

captureEditTokenFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditAccessProvider>
      <App />
    </EditAccessProvider>
  </StrictMode>,
)

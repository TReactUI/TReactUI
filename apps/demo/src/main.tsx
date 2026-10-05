import { StrictMode } from 'react'
import * as ReactDOM from 'react-dom/client'
import { TerminalPage } from './terminal-page'

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
)

root.render(
  <StrictMode>
    <TerminalPage />
  </StrictMode>,
)

import './i18n/config'
import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

export const Site = React.lazy(() => import('./Application.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <Site />
    </React.Suspense>
  </React.StrictMode>,
)

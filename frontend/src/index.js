import React from 'react'
import { createRoot } from 'react-dom/client'
import TravelPlanner from './components/TravelPlanner'

const root = createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <TravelPlanner />
  </React.StrictMode>
)

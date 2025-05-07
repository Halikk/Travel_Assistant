// src/components/ui/card.jsx
import React from 'react'

export function Card({ className, children, ...props }) {
  return (
    <div className={`rounded-2xl bg-white shadow-lg overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

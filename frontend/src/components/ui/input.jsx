// src/components/ui/input.jsx
import React from 'react'

export function Input({ className = '', ...props }) {
  return (
    <input
      className={
        `w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ` +
        className
      }
      {...props}
    />
  )
}

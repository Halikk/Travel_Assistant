// src/components/ui/textarea.jsx
import React from 'react'

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={
        `w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ` +
        className
      }
      {...props}
    />
  )
}

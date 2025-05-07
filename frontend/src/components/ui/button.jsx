// src/components/ui/button.jsx
import React from 'react'

const variants = {
  default: 'bg-blue-500 text-white hover:bg-blue-600',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100',
  link: 'bg-transparent underline text-blue-500 hover:text-blue-600 p-0'
}

export function Button({
  variant = 'default',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={
        `rounded-xl font-medium px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ` +
        variants[variant] +
        ' ' +
        className
      }
      {...props}
    >
      {children}
    </button>
  )
}

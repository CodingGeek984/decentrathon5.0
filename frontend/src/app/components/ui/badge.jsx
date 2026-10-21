import React from 'react';

const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-300',
    secondary: 'bg-gray-100 text-gray-800 border-gray-300',
    outline: 'border border-gray-300 text-gray-700 bg-transparent',
    destructive: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
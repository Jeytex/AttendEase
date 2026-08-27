import React from 'react';

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  variant = 'dark', // 'dark' | 'light'
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${variant === 'dark' ? 'text-neutral-300' : 'text-neutral-700'}`}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-150 ${
          variant === 'dark'
            ? 'neu-inset-dark text-white placeholder-neutral-500 focus:border-white focus:bg-neutral-900'
            : 'neu-inset-light text-black placeholder-neutral-400 focus:border-black focus:bg-white'
        }`}
        {...props}
      />
    </div>
  );
}

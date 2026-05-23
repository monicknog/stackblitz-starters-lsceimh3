'use client';

import type { InputHTMLAttributes } from 'react';

interface ClearableTextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function ClearableTextInput({
  value,
  onChange,
  className = '',
  ...props
}: ClearableTextInputProps) {
  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} w-full pr-10`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar campo de busca"
          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-400 hover:text-white"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

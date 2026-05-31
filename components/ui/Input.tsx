import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

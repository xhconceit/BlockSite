import { type InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ${className}`}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

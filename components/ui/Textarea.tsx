import { type TextareaHTMLAttributes, forwardRef } from "react";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 resize-none ${className}`}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

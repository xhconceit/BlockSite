import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "destructive" | "outline" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  default: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  destructive: "bg-red-400 text-zinc-900 hover:bg-red-500",
  outline: "border border-zinc-700 text-zinc-100 hover:bg-zinc-800",
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
  link: "text-lime-300 underline-offset-4 hover:underline",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };

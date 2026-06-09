import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

function Badge({ children, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${className}`}
      style={color ? { backgroundColor: `${color}20`, color } : {}}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };

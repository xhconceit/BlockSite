interface BadgeProps {
  children: string;
  color?: string;
}

export default function Badge({ children, color }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color ? `${color}20` : undefined, color: color }}
    >
      {children}
    </span>
  );
}

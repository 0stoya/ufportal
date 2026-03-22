import clsx from "clsx";

type Variant = "brand" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const base = [
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
  "transition-colors select-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
  "ring-offset-background", // Crucial for dark mode focus rings
].join(" ");

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-8 text-base",
};

const variants: Record<Variant, string> = {
  brand: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",

  ghost: "hover:bg-accent hover:text-accent-foreground",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      type={type ?? "button"}
      className={clsx(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}
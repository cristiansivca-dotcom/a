import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", ...props }, ref) => {
        const variants = {
            primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
            secondary: "glass text-white glass-hover",
            ghost: "hover:bg-white/5 text-gray-400 hover:text-white"
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };

import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "gold" | "cyan" | "violet" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  gold: "btn-game-gold",
  cyan: "btn-game-cyan",
  violet: "btn-game-violet",
  ghost: "btn-game-ghost",
  danger: "btn-game-danger",
};

type Props = Omit<HTMLMotionProps<"button">, "children"> &
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    variant?: Variant;
    size?: "md" | "lg" | "xl";
    children?: React.ReactNode;
  };

/** Chunky arcade-style button with bevel, glow and press feedback. */
const GameButton = forwardRef<HTMLButtonElement, Props>(({ variant = "gold", size = "lg", className, children, disabled, ...rest }, ref) => (
  <motion.button
    ref={ref}
    whileHover={disabled ? undefined : { y: -2 }}
    whileTap={disabled ? undefined : { y: 3, scale: 0.98 }}
    disabled={disabled}
    className={cn(
      "btn-game relative inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.14em] select-none",
      size === "md" && "h-11 px-5 text-[11px] rounded-xl",
      size === "lg" && "h-14 px-7 text-xs md:text-sm rounded-2xl",
      size === "xl" && "h-16 md:h-20 px-8 text-sm md:text-base rounded-2xl",
      VARIANTS[variant],
      disabled && "saturate-0 brightness-[0.6] cursor-not-allowed",
      className,
    )}
    {...rest}
  >
    {children}
  </motion.button>
));
GameButton.displayName = "GameButton";

export default GameButton;

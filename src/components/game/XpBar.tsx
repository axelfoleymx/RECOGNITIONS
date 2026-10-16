import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface XpBarProps {
  value: number; // 0..1
  className?: string;
  fillClassName?: string;
}

const XpBar = ({ value, className, fillClassName }: XpBarProps) => (
  <div className={cn("xp-track", className)}>
    <motion.div
      className={cn("xp-fill", fillClassName)}
      initial={{ width: 0 }}
      animate={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    />
  </div>
);

export default XpBar;

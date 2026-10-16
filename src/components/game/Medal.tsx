import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MedalProps {
  size?: number;
  emoji?: string;
  active?: boolean;
  className?: string;
}

/** Gold medal with ribbon (used for Recognitions; trophies are for awards). */
const Medal = ({ size = 120, emoji = "★", active = false, className }: MedalProps) => {
  const uid = useId().replace(/:/g, "");
  const gold = `mgold-${uid}`;
  const rim = `mrim-${uid}`;
  return (
    <motion.div
      className={cn("relative inline-flex justify-center select-none", className)}
      style={{ width: size, height: size * 1.4 }}
      animate={active ? { scale: 1.1, rotate: [0, -6, 6, -3, 0] } : { scale: 1, rotate: 0 }}
      transition={active ? { duration: 0.5 } : { type: "spring", stiffness: 260, damping: 18 }}
    >
      <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={cn("overflow-visible", active && "drop-glow")} aria-hidden>
        <defs>
          <radialGradient id={gold} cx="38%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="35%" stopColor="#FFD23F" />
            <stop offset="75%" stopColor="#E09A00" />
            <stop offset="100%" stopColor="#8A4F00" />
          </radialGradient>
          <linearGradient id={rim} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFF3B8" />
            <stop offset="50%" stopColor="#B87400" />
            <stop offset="100%" stopColor="#FFE07A" />
          </linearGradient>
        </defs>
        {/* ribbon */}
        <path d="M22 0 H44 L60 54 H38 Z" fill="#7C3AED" />
        <path d="M30 0 H36 L52 54 H46 Z" fill="#22D3EE" opacity="0.9" />
        <path d="M78 0 H56 L40 54 H62 Z" fill="#9333EA" />
        <path d="M70 0 H64 L48 54 H54 Z" fill="#F472B6" opacity="0.85" />
        {/* clasp */}
        <rect x="36" y="50" width="28" height="10" rx="3" fill={`url(#${rim})`} />
        {/* disc */}
        <circle cx="50" cy="96" r="38" fill={`url(#${rim})`} />
        <circle cx="50" cy="96" r="32" fill={`url(#${gold})`} />
        <circle cx="50" cy="96" r="26" fill="none" stroke="#FFF3B8" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M30 80 C36 70 46 66 56 67" fill="none" stroke="#FFFBE6" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
        <text x="50" y="98" textAnchor="middle" dominantBaseline="middle" fontSize="26" fill="#8A4F00" fontWeight="700">
          {emoji}
        </text>
      </svg>
    </motion.div>
  );
};

export default Medal;

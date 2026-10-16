import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrophyProps {
  size?: number;
  /** emoji engraved on the cup */
  emoji?: string;
  /** glows and bounces (e.g. while a person is dragged over it) */
  active?: boolean;
  /** violet aura for the Rocketer mega trophy */
  variant?: "gold" | "mega";
  className?: string;
}

/** Golden award statuette drawn in SVG (no external assets). */
const Trophy = ({ size = 120, emoji, active = false, variant = "gold", className }: TrophyProps) => {
  const uid = useId().replace(/:/g, "");
  const gold = `gold-${uid}`;
  const goldV = `goldv-${uid}`;
  const aura = `aura-${uid}`;

  return (
    <motion.div
      className={cn("relative inline-flex items-end justify-center select-none", className)}
      style={{ width: size, height: size * 1.33 }}
      animate={active ? { scale: 1.12, rotate: [0, -4, 4, -2, 0] } : { scale: 1, rotate: 0 }}
      transition={active ? { duration: 0.5 } : { type: "spring", stiffness: 260, damping: 18 }}
    >
      <svg
        viewBox="0 0 120 160"
        width={size}
        height={size * 1.33}
        className={cn("overflow-visible transition-[filter] duration-300", active && "drop-glow")}
        aria-hidden
      >
        <defs>
          <linearGradient id={gold} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8A4F00" />
            <stop offset="22%" stopColor="#F2B200" />
            <stop offset="40%" stopColor="#FFF3B8" />
            <stop offset="58%" stopColor="#FFD23F" />
            <stop offset="82%" stopColor="#C77F00" />
            <stop offset="100%" stopColor="#7A4200" />
          </linearGradient>
          <linearGradient id={goldV} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFE680" />
            <stop offset="100%" stopColor="#A86200" />
          </linearGradient>
          <radialGradient id={aura} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={variant === "mega" ? "#B66BFF" : "#FFD23F"} stopOpacity="0.55" />
            <stop offset="100%" stopColor={variant === "mega" ? "#B66BFF" : "#FFD23F"} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* aura */}
        <ellipse cx="60" cy="62" rx="64" ry="64" fill={`url(#${aura})`} opacity={active ? 1 : 0.55} />

        {/* handles */}
        <path d="M24 24 C2 24 2 62 34 66" fill="none" stroke={`url(#${goldV})`} strokeWidth="8" strokeLinecap="round" />
        <path d="M96 24 C118 24 118 62 86 66" fill="none" stroke={`url(#${goldV})`} strokeWidth="8" strokeLinecap="round" />

        {/* cup */}
        <path d="M20 12 H100 V40 C100 74 82 94 60 98 C38 94 20 74 20 40 Z" fill={`url(#${gold})`} />
        <ellipse cx="60" cy="12" rx="40" ry="5" fill="#FFF3B8" opacity="0.9" />
        <ellipse cx="60" cy="12" rx="34" ry="3" fill="#B87400" opacity="0.6" />
        {/* highlight */}
        <path d="M32 20 C30 50 38 74 52 88" fill="none" stroke="#FFFBE6" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />

        {/* stem */}
        <rect x="52" y="96" width="16" height="16" fill={`url(#${gold})`} />
        <ellipse cx="60" cy="112" rx="14" ry="5" fill={`url(#${gold})`} />
        <path d="M40 118 H80 L88 136 H32 Z" fill={`url(#${gold})`} />

        {/* plinth */}
        <rect x="22" y="136" width="76" height="20" rx="3" fill="#1A1033" stroke="#FFD23F" strokeOpacity="0.5" />
        <rect x="40" y="141" width="40" height="10" rx="2" fill={`url(#${gold})`} />

        {emoji && (
          <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" fontSize="30">
            {emoji}
          </text>
        )}
      </svg>
    </motion.div>
  );
};

export default Trophy;

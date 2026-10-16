import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = [
  "hsl(45, 100%, 50%)",   // gold
  "hsl(190, 100%, 50%)",  // cyan
  "hsl(0, 84%, 60%)",     // red
  "hsl(280, 80%, 60%)",   // purple
  "hsl(120, 70%, 50%)",   // green
  "hsl(30, 100%, 55%)",   // orange
];

const Confetti = ({ count = 80 }: { count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
        size: 6 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 200,
      })),
    [count]
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "-10%", x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: "110vh",
            x: `calc(${p.x}vw + ${p.drift}px)`,
            opacity: [1, 1, 0],
            rotate: p.rotation + 720,
            scale: [1, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "2px",
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;

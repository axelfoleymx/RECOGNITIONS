import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPACE_EMOJIS = ["🚀", "⭐", "✨", "🌟", "🌠", "🛸", "🪐", "🌌", "👨‍🚀", "💫", "☄️", "🌙"];

interface Burst {
  id: number;
  x: number;
  y: number;
  emojis: { emoji: string; angle: number; distance: number; rotation: number; size: number }[];
}

interface EmojiBurstProps {
  triggerOnClick?: boolean;
  triggerSignal?: number;
  count?: number;
}

const EmojiBurst = ({ triggerOnClick = false, triggerSignal = 0, count = 18 }: EmojiBurstProps) => {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const createBurst = useCallback(
    (x: number, y: number) => {
      const id = Date.now() + Math.random();
      const emojis = Array.from({ length: count }, (_, i) => ({
        emoji: SPACE_EMOJIS[Math.floor(Math.random() * SPACE_EMOJIS.length)],
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
        distance: 80 + Math.random() * 140,
        rotation: (Math.random() - 0.5) * 720,
        size: 20 + Math.random() * 18,
      }));
      setBursts((prev) => [...prev, { id, x, y, emojis }]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1500);
    },
    [count]
  );

  useEffect(() => {
    if (!triggerOnClick) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select, [role='button'], [role='checkbox'], [role='combobox'], label")) {
        return;
      }
      createBurst(e.clientX, e.clientY);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [triggerOnClick, createBurst]);

  useEffect(() => {
    if (triggerSignal > 0) {
      createBurst(window.innerWidth / 2, window.innerHeight / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSignal]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <div key={burst.id} className="absolute" style={{ left: burst.x, top: burst.y }}>
            {burst.emojis.map((e, i) => {
              const dx = Math.cos(e.angle) * e.distance;
              const dy = Math.sin(e.angle) * e.distance;
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                  animate={{ x: dx, y: dy, opacity: 0, scale: 1, rotate: e.rotation }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute select-none"
                  style={{ fontSize: e.size, lineHeight: 1, transform: "translate(-50%, -50%)" }}
                >
                  {e.emoji}
                </motion.span>
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default EmojiBurst;

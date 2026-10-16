import { useEffect, useMemo, useState } from "react";

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
};

const LAYERS = [
  { count: 60, maxSize: 1.4, opacity: 0.5, drift: 0 },
  { count: 35, maxSize: 2.2, opacity: 0.8, drift: 1 },
  { count: 15, maxSize: 3.2, opacity: 1, drift: 2 },
];

const StarField = () => {
  const reduced = usePrefersReducedMotion();

  const stars = useMemo(
    () =>
      LAYERS.flatMap((layer, li) =>
        Array.from({ length: layer.count }, (_, i) => ({
          id: `${li}-${i}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * layer.maxSize + 0.8,
          duration: Math.random() * 4 + 2,
          delay: Math.random() * 6,
          opacity: layer.opacity,
          drift: layer.drift,
        }))
      ),
    []
  );

  const shootingStars = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        top: Math.random() * 55,
        left: Math.random() * 60,
        delay: i * 6 + Math.random() * 5,
        duration: 1.4 + Math.random() * 0.8,
        length: 120 + Math.random() * 120,
      })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Soft nebulas */}
      <div className="nebula-glow nebula-a" />
      <div className="nebula-glow nebula-b" />

      {stars.map((star) => (
        <div
          key={star.id}
          className={reduced ? "absolute rounded-full bg-foreground" : `absolute rounded-full bg-foreground animate-twinkle star-drift-${star.drift}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            boxShadow: star.size > 2 ? `0 0 ${star.size * 3}px hsl(var(--foreground) / 0.6)` : undefined,
            "--duration": `${star.duration}s`,
            "--delay": `${star.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {!reduced &&
        shootingStars.map((s) => (
          <span
            key={s.id}
            className="shooting-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.length}px`,
              "--duration": `${s.duration}s`,
              "--delay": `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
    </div>
  );
};

export default StarField;

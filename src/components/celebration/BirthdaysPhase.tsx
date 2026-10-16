import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Confetti from "./Confetti";
import EmojiBurst from "@/components/EmojiBurst";
import cakeAsset from "@/assets/cake.png.asset.json";

export interface BirthdayPerson {
  id: string;
  name: string;
  photo_url: string | null;
  song_url: string | null;
  birthday: string; // YYYY-MM-DD
}

interface BirthdaysPhaseProps {
  birthdays: BirthdayPerson[];
  /** -1 = teaser slide; 0..n-1 = person slide */
  index: number;
  onFinish?: () => void;
  finishLabel?: string;
}

const BALLOON_EMOJIS = ["🎈", "🎈", "🎉", "🎂", "🎁", "✨", "⭐", "🚀"];
const FALLING_EMOJIS = ["🎉", "🎊", "✨", "⭐", "🎂", "🎈"];
const VIDEO_IDS = ["xJwktBHntTc", "2o94pyMrB2g"];

const BirthdaysPhase = ({ birthdays, index, onFinish, finishLabel = "Terminar felicitación 🚀" }: BirthdaysPhaseProps) => {
  const person = birthdays.length > 0 ? birthdays[Math.min(Math.max(index, 0), birthdays.length - 1)] : null;

  const videoId = useMemo(
    () => VIDEO_IDS[Math.floor(Math.random() * VIDEO_IDS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person?.id]
  );

  if (birthdays.length === 0) return null;

  // Teaser slide
  if (index < 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.p
          className="text-sm uppercase tracking-[0.4em] text-muted-foreground mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Una pausa especial
        </motion.p>

        <motion.h2
          className="font-display text-3xl md:text-5xl lg:text-6xl max-w-4xl leading-tight"
          style={{
            color: "hsl(var(--star-gold))",
            textShadow: "0 0 30px hsl(var(--star-gold) / 0.5)",
          }}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
        >
          Oh, espera…
        </motion.h2>

        <motion.p
          className="font-display text-xl md:text-3xl mt-8 max-w-3xl text-foreground/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          el equipo tiene algo muy especial que decir...
        </motion.p>

        <motion.div
          className="flex gap-3 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: "hsl(var(--star-gold))" }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    );
  }

  if (!person) return null;

  // Generate floating balloons
  const balloons = Array.from({ length: 18 }, (_, i) => ({
    emoji: BALLOON_EMOJIS[i % BALLOON_EMOJIS.length],
    left: `${(i * 7 + 4) % 96}%`,
    delay: (i % 6) * 0.4,
    duration: 7 + (i % 5),
    size: 32 + ((i * 13) % 28),
  }));

  // Generate falling confetti emojis
  const confetti = Array.from({ length: 24 }, (_, i) => ({
    emoji: FALLING_EMOJIS[i % FALLING_EMOJIS.length],
    left: `${(i * 4.3 + 2) % 98}%`,
    delay: (i % 8) * 0.3,
    duration: 4 + (i % 4),
    size: 18 + ((i * 7) % 18),
  }));

  return (
    <motion.div
      key={person.id}
      className="relative flex flex-col items-center justify-start h-full px-6 py-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dense confetti rain (looping) */}
      <Confetti count={160} />
      <Confetti key={`c2-${person.id}`} count={120} />
      {/* Click anywhere → emoji burst */}
      <EmojiBurst triggerOnClick count={22} />

      {/* Floating balloons rising */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {balloons.map((b, i) => (
          <motion.span
            key={`bal-${i}`}
            className="absolute"
            style={{
              left: b.left,
              bottom: "-10%",
              fontSize: `${b.size}px`,
              filter: "drop-shadow(0 0 12px hsl(var(--star-gold) / 0.5))",
            }}
            initial={{ y: 0, opacity: 0, rotate: -10 }}
            animate={{
              y: ["0vh", "-120vh"],
              opacity: [0, 1, 1, 0],
              rotate: [-10, 10, -10, 10],
            }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {b.emoji}
          </motion.span>
        ))}
      </div>

      {/* Falling confetti emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c, i) => (
          <motion.span
            key={`conf-${i}`}
            className="absolute"
            style={{
              left: c.left,
              top: "-5%",
              fontSize: `${c.size}px`,
            }}
            initial={{ y: 0, opacity: 0, rotate: 0 }}
            animate={{
              y: ["0vh", "110vh"],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {c.emoji}
          </motion.span>
        ))}
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={person.id}
          className="relative z-10 flex flex-col items-center text-center max-w-5xl w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.p
            className="text-xs md:text-sm uppercase tracking-[0.4em] text-muted-foreground mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            🎂 Cumpleaños de la semana 🎂
          </motion.p>

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 120, damping: 12 }}
            >
              <Avatar
                className="h-32 w-32 md:h-44 md:w-44 portal-ring"
                style={{
                  boxShadow:
                    "0 0 60px hsl(var(--star-gold) / 0.6), 0 0 120px hsl(var(--primary) / 0.4)",
                }}
              >
                {person.photo_url && <AvatarImage src={person.photo_url} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-3xl">
                  {person.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="flex flex-col items-center md:items-start">
              <motion.h2
                className="font-display text-3xl md:text-5xl lg:text-6xl tracking-tight"
                style={{
                  color: "hsl(var(--star-gold))",
                  textShadow:
                    "0 0 40px hsl(var(--star-gold) / 0.7), 0 0 90px hsl(var(--nebula-cyan) / 0.4)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                ¡FELIZ CUMPLEAÑOS!
              </motion.h2>

              <motion.h3
                className="font-display text-2xl md:text-4xl lg:text-5xl mt-3"
                style={{
                  color: "hsl(var(--nebula-cyan))",
                  textShadow: "0 0 30px hsl(var(--nebula-cyan) / 0.7)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 140, damping: 12 }}
              >
                {person.name} 🎉
              </motion.h3>

              <motion.p
                className="text-base md:text-xl mt-4 text-foreground/90 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              >
                De parte de toda la tripulación Rocketing 🚀
              </motion.p>
            </div>
          </div>

          {/* Cake + video row */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-8 w-full">
            <motion.img
              src={cakeAsset.url}
              alt={`Pastel de cumpleaños de ${person.name}`}
              className="w-32 md:w-44 select-none pointer-events-none"
              style={{ filter: "drop-shadow(0 0 30px hsl(var(--star-gold) / 0.5))" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: [0, -12, 0] }}
              transition={{
                opacity: { delay: 1.2, duration: 0.6 },
                y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
              }}
            />

            <motion.div
              className="glass-card overflow-hidden w-full max-w-xl aspect-video"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Video de cumpleaños"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </motion.div>
          </div>

          <motion.button
            className="btn-space mt-8 px-8 py-3 rounded-full text-base md:text-lg"
            onClick={(e) => {
              e.stopPropagation();
              onFinish?.();
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            {finishLabel}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots if multiple birthdays */}
      {birthdays.length > 1 && (
        <div className="mt-6 mb-2 flex gap-2 z-20">
          {birthdays.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: i === index ? 32 : 8,
                backgroundColor:
                  i === index
                    ? "hsl(var(--star-gold))"
                    : "hsl(var(--muted-foreground) / 0.3)",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default BirthdaysPhase;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";
import Confetti from "./Confetti";
import { youtubeId } from "@/lib/gamification";

interface WinnerEntry {
  name: string;
  photoUrl: string | null;
  voteCount: number;
}

interface WinnerRevealPhaseProps {
  winners: WinnerEntry[];
  /** winner's victory video (YouTube); embedded with autoplay + open link */
  videoUrl?: string | null;
}

const WinnerRevealPhase = ({ winners, videoUrl }: WinnerRevealPhaseProps) => {
  const videoId = youtubeId(videoUrl);
  const [showContent, setShowContent] = useState(false);
  const isTie = winners.length > 1;

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Adjust avatar size based on number of winners
  const avatarSize = isTie
    ? winners.length <= 2
      ? "h-32 w-32 md:h-40 md:w-40"
      : "h-24 w-24 md:h-32 md:w-32"
    : "h-40 w-40 md:h-56 md:w-56";

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Golden flash */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "hsl(var(--star-gold))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8 }}
      />

      {showContent && <Confetti count={100} />}

      {showContent && (
        <motion.div
          className="flex flex-col items-center gap-6 z-30"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
        >
          {isTie && (
            <motion.p
              className="font-display text-xl md:text-2xl uppercase tracking-widest text-center"
              style={{ color: "hsl(var(--star-gold))" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ¡Empate!
            </motion.p>
          )}

          <div className={`flex items-center justify-center ${isTie ? "gap-8 md:gap-12 flex-wrap" : ""}`}>
            {winners.map((winner, idx) => (
              <motion.div
                key={idx}
                className="flex flex-col items-center gap-3"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.2 }}
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 30px hsl(45 100% 50% / 0.4)",
                      "0 0 80px hsl(45 100% 50% / 0.7)",
                      "0 0 30px hsl(45 100% 50% / 0.4)",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="rounded-full p-1"
                  style={{ border: "3px solid hsl(var(--star-gold))" }}
                >
                  <Avatar className={avatarSize}>
                    {winner.photoUrl && <AvatarImage src={winner.photoUrl} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-4xl">
                      {winner.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <motion.h1
                  className={`font-display text-center ${isTie ? "text-3xl md:text-5xl" : "text-5xl md:text-8xl"}`}
                  style={{
                    color: "hsl(var(--star-gold))",
                    textShadow: "0 0 40px hsl(var(--star-gold) / 0.6)",
                  }}
                >
                  {winner.name}
                </motion.h1>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + winners.length * 0.2 }}
          >
            <span className="text-4xl">🏆</span>
            <span
              className="font-display text-2xl md:text-3xl"
              style={{ color: "hsl(var(--star-gold))" }}
            >
              {isTie ? "Rocketers de la semana" : "Rocketer de la semana"}
            </span>
          </motion.div>

          {videoId && (
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-card overflow-hidden w-[min(90vw,480px)] aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Video de victoria"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
              <a
                href={videoUrl!}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                Abrir en YouTube <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default WinnerRevealPhase;

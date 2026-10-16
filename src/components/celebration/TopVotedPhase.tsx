import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface VoteEntry {
  personId: string;
  name: string;
  photoUrl: string | null;
  count: number;
  reasons: string[];
}

interface TopVotedPhaseProps {
  topVoted: VoteEntry[];
  maxVotes: number;
  revealedIndex: number;
  tiedCount: number;
}

const TopVotedPhase = ({ topVoted, maxVotes, revealedIndex, tiedCount }: TopVotedPhaseProps) => {
  // positions = everyone except winners (tied at top), reversed so lowest shows first
  const positions = topVoted.filter((v) => v.count < maxVotes).reverse();

  const getPlace = (idx: number) => {
    return topVoted.length - idx;
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-8 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h2
        className="font-display text-3xl md:text-5xl text-center"
        style={{ color: "hsl(var(--star-gold))" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Y los más votados son...
      </motion.h2>

      <div className="flex flex-col gap-6 w-full max-w-xl mt-4">
        <AnimatePresence>
          {positions.map((entry, i) =>
            i <= revealedIndex ? (
              <motion.div
                key={entry.personId}
                className="relative flex items-center gap-4 glass-card p-4"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
              >
                <span
                  className="font-display text-3xl w-12 text-center"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {getPlace(i)}°
                </span>
                <Avatar className="h-14 w-14 portal-ring shrink-0">
                  {entry.photoUrl && <AvatarImage src={entry.photoUrl} />}
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-sm">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-lg">{entry.name}</p>
                </div>
                {/* Reasons */}
                {entry.reasons.filter(r => r.trim()).length > 0 && i === revealedIndex && (
                  <motion.div
                    className="absolute left-0 right-0 -bottom-2 translate-y-full flex flex-wrap gap-2 px-14 pt-2"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {entry.reasons.filter(r => r.trim()).map((reason, ri) => (
                      <span
                        key={ri}
                        className="text-xs italic px-2 py-1 rounded-full bg-muted/50 text-muted-foreground"
                      >
                        &ldquo;{reason}&rdquo;
                      </span>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>

        {/* Mystery 1st place */}
        <motion.div
          className="flex items-center gap-4 glass-card-glow p-4 neon-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealedIndex >= positions.length - 1 ? 1 : 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <span
            className="font-display text-4xl w-12 text-center"
            style={{ color: "hsl(var(--star-gold))" }}
          >
            1°
          </span>
          <div className="h-14 w-14 rounded-full flex items-center justify-center bg-muted shrink-0">
            <motion.span
              className="font-display text-3xl"
              style={{ color: "hsl(var(--star-gold))" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ?
            </motion.span>
          </div>
          <p
            className="font-display text-xl flex-1"
            style={{ color: "hsl(var(--star-gold))" }}
          >
            {tiedCount > 1 ? "¿Quiénes serán?" : "¿Quién será?"}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TopVotedPhase;

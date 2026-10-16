import { motion, AnimatePresence } from "framer-motion";

interface IntroPhaseProps {
  weekLabel: string;
}

const IntroPhase = ({ weekLabel }: IntroPhaseProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h1
        className="font-display text-5xl md:text-7xl tracking-widest"
        style={{ color: "hsl(var(--star-gold))" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        🚀 Rocketing Recognitions
      </motion.h1>

      <motion.p
        className="text-xl md:text-2xl text-muted-foreground"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ textShadow: "0 0 20px hsl(var(--star-gold) / 0.4)" }}
      >
        {weekLabel}
      </motion.p>

      <motion.p
        className="text-muted-foreground/50 text-sm mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Presiona → para comenzar
      </motion.p>
    </motion.div>
  );
};

export default IntroPhase;

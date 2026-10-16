import { motion } from "framer-motion";

const words = ["Y", "el/la", "ganador/a", "de", "la", "semana", "es..."];

const SuspensePhase = () => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Vignette overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, hsl(var(--space-deep) / 0.7) 100%)",
        }}
      />

      {/* Text word by word */}
      <motion.div
        className="flex flex-wrap justify-center gap-x-4 gap-y-2 z-30 px-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.25 } },
        }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="font-display text-4xl md:text-6xl lg:text-7xl"
            style={{
              color: "hsl(var(--star-gold))",
              textShadow: "0 0 30px hsl(var(--star-gold) / 0.5)",
            }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>

      {/* Pulsing question mark */}
      <motion.div
        className="relative z-30 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.8, type: "spring", stiffness: 120, damping: 10 }}
      >
        <motion.div
          className="h-40 w-40 md:h-56 md:w-56 rounded-full flex items-center justify-center"
          style={{
            background: "hsl(var(--space-deep) / 0.6)",
            border: "3px solid hsl(var(--star-gold))",
          }}
          animate={{
            scale: [1, 1.12, 1],
            boxShadow: [
              "0 0 30px hsl(45 100% 50% / 0.3)",
              "0 0 80px hsl(45 100% 50% / 0.7)",
              "0 0 30px hsl(45 100% 50% / 0.3)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <span
            className="font-display text-8xl md:text-9xl"
            style={{
              color: "hsl(var(--star-gold))",
              textShadow: "0 0 40px hsl(var(--star-gold) / 0.6)",
            }}
          >
            ?
          </span>
        </motion.div>

      </motion.div>

      {/* Animated dots */}
      <motion.div
        className="flex gap-3 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "hsl(var(--star-gold))" }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default SuspensePhase;

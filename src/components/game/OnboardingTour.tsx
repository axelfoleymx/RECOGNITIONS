import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import GameButton from "./GameButton";

const SEEN_KEY = "rocketing-tour-v2";

const SLIDES = [
  {
    emoji: "🚀",
    title: "Cada semana es una misión",
    body: "Completa 3 sistemas para despegar: Recognitions y premios, Rocketer y Autoevaluación. Hitos es un bonus. Cada uno te da XP para subir de nivel.",
  },
  {
    emoji: "🏅",
    title: "Una sola encuesta, varios premios",
    body: "Cada pregunta es un premio de la semana. Toca o desliza a quien se lo ganó y califica con 1 a 3 🚀. Quien junte más 🚀 gana ese premio. Al final puedes dar medallas libres a quien quieras, con tu nombre o en anónimo.",
  },
  {
    emoji: "🪞",
    title: "¿Cómo te sentiste?",
    body: "La autoevaluación es privada: solo RH la ve. El equipo solo ve el clima general con caritas, para echarnos la mano cuando alguien tuvo una semana pesada.",
  },
  {
    emoji: "🎬",
    title: "El viernes se revela todo",
    body: "En la presentación salen los hitos, los ganadores de cada premio, las medallas y el Rocketer. Pon tu video de YouTube en la Nave: suena si ganas el Rocketer.",
  },
];

/** First-visit walkthrough; reopen it with the "?" button in the header. */
const OnboardingTour = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    onOpenChange(false);
  };

  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="bg-card border-primary/40 max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-3 py-2">
            <div className="text-6xl">{s.emoji}</div>
            <DialogTitle className="font-display text-xl text-gold-gradient">{s.title}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/85 leading-relaxed">{s.body}</DialogDescription>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {SLIDES.map((_, j) => (
            <span key={j} className={cn("h-1.5 rounded-full transition-all", j === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
          ))}
        </div>
        <div className="flex gap-2">
          <GameButton variant="ghost" size="md" className="flex-1" onClick={close}>
            Saltar
          </GameButton>
          <GameButton variant="gold" size="md" className="flex-1" onClick={() => (last ? close() : setI(i + 1))}>
            {last ? "¡A despegar!" : "Siguiente"}
          </GameButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const tourSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
};

export default OnboardingTour;

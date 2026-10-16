import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LABELS = ["", "Bien hecho", "Muy por encima", "¡Épico!"];

interface RocketPickerProps {
  value: number;
  onChange: (v: number) => void;
}

/** 1–3 rocket intensity selector used in peer votes. */
const RocketPicker = ({ value, onChange }: RocketPickerProps) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex gap-3">
      {[1, 2, 3].map((n) => (
        <motion.button
          key={n}
          type="button"
          whileTap={{ scale: 0.85 }}
          animate={n <= value ? { y: -6, scale: 1.15 } : { y: 0, scale: 1 }}
          onClick={() => onChange(n)}
          aria-label={`${n} cohete${n > 1 ? "s" : ""}`}
          className={cn(
            "h-14 w-14 rounded-xl text-3xl flex items-center justify-center border transition-colors",
            n <= value
              ? "border-primary/70 bg-primary/15 shadow-[0_0_18px_hsl(var(--star-gold)/0.45)]"
              : "border-border bg-muted/40 grayscale opacity-50",
          )}
        >
          🚀
        </motion.button>
      ))}
    </div>
    <span className="hud-label text-primary">{LABELS[value]}</span>
  </div>
);

export default RocketPicker;

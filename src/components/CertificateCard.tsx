import { motion } from "framer-motion";
import { Rocket, Star } from "lucide-react";

interface CertificateCardProps {
  employeeName: string;
  summaryText: string;
  dateRange: string;
  photoUrl?: string | null;
}

const CertificateCard = ({ employeeName, summaryText, dateRange, photoUrl }: CertificateCardProps) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-xl mx-auto"
    >
      {/* Outer glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 blur-md" />

      {/* Card */}
      <div className="relative rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-sm p-8 md:p-10 overflow-hidden">
        {/* Corner stars */}
        <Star className="absolute top-4 left-4 h-4 w-4 text-primary/40" />
        <Star className="absolute top-4 right-4 h-4 w-4 text-accent/40" />
        <Star className="absolute bottom-4 left-4 h-4 w-4 text-accent/40" />
        <Star className="absolute bottom-4 right-4 h-4 w-4 text-primary/40" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="font-display text-xs tracking-[0.3em] uppercase text-primary/70">
              Rocketing Agency
            </span>
            <Rocket className="h-5 w-5 text-primary rotate-45" />
          </div>
          <h2 className="font-display text-lg md:text-xl tracking-wider text-accent uppercase">
            Certificado de Logro Estelar
          </h2>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-6" />

        {/* Photo */}
        {photoUrl && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            <div className="h-20 w-20 rounded-full border-2 border-primary/50 overflow-hidden shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <img src={photoUrl} alt={employeeName} className="h-full w-full object-cover" />
            </div>
          </motion.div>
        )}

        {/* Name */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-muted-foreground text-sm mb-1"
        >
          Se otorga a
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-display text-2xl md:text-3xl font-bold text-primary text-center mb-4 tracking-wide"
        >
          Astronauta {employeeName}
        </motion.h3>

        {/* Summary */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-foreground/90 leading-relaxed italic text-sm md:text-base mb-6"
          style={{ textWrap: "pretty" }}
        >
          &ldquo;{summaryText}&rdquo;
        </motion.p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent mb-4" />

        {/* Date */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-muted-foreground text-xs tracking-wider"
        >
          Misión de la semana · {dateRange}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default CertificateCard;

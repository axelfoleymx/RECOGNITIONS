import { AlertTriangle, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePendingVote } from "@/hooks/usePendingVote";

interface Props {
  /** sticky bar (default) or inline card inside a form/page */
  variant?: "sticky" | "inline";
  className?: string;
}

const VoteReminderBanner = ({ variant = "sticky", className = "" }: Props) => {
  const { pending } = usePendingVote();
  const navigate = useNavigate();
  const location = useLocation();

  // On the voting page itself the reminder is redundant
  if (location.pathname === "/vote") return null;

  const content = (
    <div className="flex items-center gap-3 w-full">
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="shrink-0"
      >
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </motion.span>
      <p className="text-sm text-destructive font-medium text-left flex-1">
        {/* compact on phones so it doesn't push the page content down */}
        <span className="sm:hidden">Te falta votar al <strong>Rocketer</strong></span>
        <span className="hidden sm:inline">
          Aún no votas por tu <strong>Rocketer de la semana</strong> — tu voto cuenta y define al ganador 🚀
        </span>
      </p>
      <Button
        size="sm"
        onClick={() => navigate("/vote")}
        className="btn-space shrink-0 gap-1"
      >
        <Star className="h-4 w-4" /> <span className="hidden sm:inline">Votar ahora</span><span className="sm:hidden">Votar</span>
      </Button>
    </div>
  );

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={
            variant === "sticky"
              ? `sticky top-0 z-40 w-full border-b border-destructive/40 bg-destructive/15 backdrop-blur-xl ${className}`
              : `glass-card border-destructive/50 bg-destructive/10 p-4 ${className}`
          }
        >
          <div
            className={
              variant === "sticky"
                ? "mx-auto max-w-5xl px-4 py-1.5 sm:py-2.5"
                : ""
            }
          >
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoteReminderBanner;

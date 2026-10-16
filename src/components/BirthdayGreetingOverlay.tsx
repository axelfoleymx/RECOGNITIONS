import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import StarField from "@/components/StarField";
import BirthdaysPhase, { BirthdayPerson } from "@/components/celebration/BirthdaysPhase";

interface Props {
  person: BirthdayPerson;
  onClose: () => void;
}

const BirthdayGreetingOverlay = ({ person, onClose }: Props) => {
  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 space-gradient overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <StarField />
      <div className="relative z-10 min-h-full flex items-center justify-center py-10">
        <BirthdaysPhase
          birthdays={[person]}
          index={0}
          onFinish={onClose}
          finishLabel="Cerrar"
        />
      </div>
    </motion.div>,
    document.body
  );
};

export default BirthdayGreetingOverlay;

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { firstName, GamePerson } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";

// Drop zones are plain elements marked with data-dropzone="<id>".
// Dragging is pointer based (framer-motion) so it works with mouse and touch;
// tapping a person and then a zone is the accessible fallback.

const clientPoint = (e: MouseEvent | TouchEvent | PointerEvent) => {
  if ("changedTouches" in e && e.changedTouches.length) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
};

export const zoneAt = (x: number, y: number): string | null => {
  for (const el of document.elementsFromPoint(x, y)) {
    const zone = (el as HTMLElement).closest?.("[data-dropzone]");
    if (zone) return zone.getAttribute("data-dropzone");
  }
  return null;
};

export type TokenState = { disabled?: boolean; badge?: string; hint?: string; highlight?: boolean; done?: boolean };

interface DraggablePersonProps {
  person: GamePerson;
  size?: number;
  selected?: boolean;
  state?: TokenState;
  onHover: (zone: string | null) => void;
  onDrop: (personId: string, zone: string) => void;
  onSelect: (personId: string) => void;
}

export const DraggablePerson = ({ person, size = 60, selected, state, onHover, onDrop, onSelect }: DraggablePersonProps) => {
  const disabled = !!state?.disabled;
  // framer can emit a tap at the end of a drag; ignore it
  const dragged = useRef(false);
  return (
    <div className="flex flex-col items-center gap-1 w-[76px]" title={state?.hint}>
      <motion.button
        type="button"
        drag={!disabled}
        dragSnapToOrigin
        dragMomentum={false}
        dragElastic={1}
        whileHover={disabled ? undefined : { scale: 1.08 }}
        whileDrag={{ scale: 1.2, zIndex: 80, cursor: "grabbing" }}
        onDragStart={() => (dragged.current = true)}
        onDrag={(e) => {
          const p = clientPoint(e);
          onHover(zoneAt(p.x, p.y));
        }}
        onDragEnd={(e) => {
          const p = clientPoint(e);
          const zone = zoneAt(p.x, p.y);
          onHover(null);
          if (zone) onDrop(person.id, zone);
          setTimeout(() => (dragged.current = false), 50);
        }}
        onTap={() => {
          if (dragged.current || disabled) return;
          onSelect(person.id);
        }}
        className={cn(
          "relative rounded-full touch-none outline-none",
          state?.highlight && !selected && "radar-pulse",
          disabled ? "opacity-35 grayscale cursor-not-allowed" : "cursor-grab",
          selected && "ring-4 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={{ zIndex: 1 }}
        aria-label={`Arrastra a ${person.name}`}
        aria-pressed={selected}
      >
        <PlayerAvatar
          name={person.name}
          photoUrl={person.photo_url}
          size={size}
          ring={selected || state?.done ? "gold" : state?.highlight ? "cyan" : "none"}
          className={cn(!state?.highlight && !selected && !state?.done && "opacity-80")}
        />
        {state?.badge && (
          <span className="absolute -top-1 -right-2 chip bg-background/90 border border-border px-1.5 py-0.5 text-[10px] text-foreground">
            {state.badge}
          </span>
        )}
      </motion.button>
      <span
        className={cn(
          "text-[11px] leading-tight text-center line-clamp-1 w-full",
          state?.highlight ? "text-accent font-semibold" : "text-muted-foreground",
        )}
      >
        {firstName(person.name)}
      </span>
      {state?.highlight && (
        <span className="font-hud text-[9px] font-bold tracking-wider rounded bg-accent/20 text-accent px-1.5 leading-4">SIN RECOG.</span>
      )}
    </div>
  );
};

interface PeopleTrayProps {
  people: GamePerson[];
  selectedId: string | null;
  stateFor?: (p: GamePerson) => TokenState | undefined;
  onHover: (zone: string | null) => void;
  onDrop: (personId: string, zone: string) => void;
  onSelect: (personId: string | null) => void;
  title?: string;
  className?: string;
}

export const PeopleTray = ({ people, selectedId, stateFor, onHover, onDrop, onSelect, title, className }: PeopleTrayProps) => (
  <div className={cn("glass-card relative z-30 p-4", className)}>
    <div className="flex items-center justify-between mb-3 gap-2">
      <span className="hud-label">{title ?? "Tripulación"}</span>
      <span className="text-xs text-muted-foreground">
        {selectedId ? "Ahora toca un trofeo 🏆" : "Arrastra una foto al trofeo · o tócala"}
      </span>
    </div>
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
      {people.map((p) => (
        <DraggablePerson
          key={p.id}
          person={p}
          selected={selectedId === p.id}
          state={stateFor?.(p)}
          onHover={onHover}
          onDrop={(pid, z) => {
            onSelect(null);
            onDrop(pid, z);
          }}
          onSelect={(pid) => onSelect(selectedId === pid ? null : pid)}
        />
      ))}
    </div>
  </div>
);

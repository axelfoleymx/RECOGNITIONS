import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/gamification";

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  ring?: "cyan" | "gold" | "violet" | "none";
  className?: string;
}

const RINGS = {
  cyan: "0 0 0 2px hsl(var(--nebula-cyan) / 0.8), 0 0 16px hsl(var(--nebula-cyan) / 0.45)",
  gold: "0 0 0 3px hsl(var(--star-gold)), 0 0 22px hsl(var(--star-gold) / 0.6)",
  violet: "0 0 0 2px hsl(var(--neon-violet) / 0.85), 0 0 16px hsl(var(--neon-violet) / 0.45)",
  none: "none",
};

const PlayerAvatar = ({ name, photoUrl, size = 48, ring = "cyan", className }: PlayerAvatarProps) => (
  <Avatar
    className={cn("shrink-0 rounded-full", className)}
    style={{ width: size, height: size, boxShadow: RINGS[ring] }}
  >
    {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" draggable={false} />}
    <AvatarFallback
      className="bg-gradient-to-br from-secondary to-muted text-foreground font-hud font-bold"
      style={{ fontSize: Math.max(10, size * 0.34) }}
    >
      {initials(name)}
    </AvatarFallback>
  </Avatar>
);

export default PlayerAvatar;

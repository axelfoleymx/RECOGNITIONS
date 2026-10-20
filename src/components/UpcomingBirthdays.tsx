import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BirthdayGreetingOverlay from "@/components/BirthdayGreetingOverlay";
import { AnimatePresence } from "framer-motion";

type Person = {
  id: string;
  name: string;
  photo_url: string | null;
  birthday: string | null;
  song_url: string | null;
};

// Monday–Sunday window of the current week
const currentWeekRange = () => {
  const start = startOfToday();
  const dow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const isBirthdayThisWeek = (birthday: string) => {
  const { start, end } = currentWeekRange();
  const [, mm, dd] = birthday.split("-").map(Number);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getMonth() + 1 === mm && d.getDate() === dd) return true;
  }
  return false;
};

const MS_DAY = 1000 * 60 * 60 * 24;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const nextOccurrence = (birthday: string) => {
  const [, mm, dd] = birthday.split("-").map(Number);
  const today = startOfToday();
  const year = today.getFullYear();
  let next = new Date(year, mm - 1, dd);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < today.getTime()) {
    next = new Date(year + 1, mm - 1, dd);
    next.setHours(0, 0, 0, 0);
  }
  return next;
};

const lastOccurrence = (birthday: string) => {
  const [, mm, dd] = birthday.split("-").map(Number);
  const today = startOfToday();
  const year = today.getFullYear();
  let last = new Date(year, mm - 1, dd);
  last.setHours(0, 0, 0, 0);
  if (last.getTime() > today.getTime()) {
    last = new Date(year - 1, mm - 1, dd);
    last.setHours(0, 0, 0, 0);
  }
  return last;
};

const daysFromToday = (date: Date) =>
  Math.round((date.getTime() - startOfToday().getTime()) / MS_DAY);

const relativeFuture = (days: number) => {
  if (days === 0) return "¡hoy! 🎂";
  if (days === 1) return "mañana";
  return `en ${days} días`;
};

const relativePast = (days: number) => {
  if (days === 1) return "ayer";
  return `hace ${days} días`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Balloon = ({ delay, x, color }: { delay: number; x: string; color: string }) => (
  <motion.div
    className="absolute text-2xl pointer-events-none"
    style={{ left: x, bottom: 0 }}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: -120, opacity: [0, 1, 1, 0] }}
    transition={{ duration: 4, delay, repeat: Infinity, repeatDelay: 2, ease: "easeOut" }}
  >
    {color}
  </motion.div>
);

/** `featured` = large banner at the top of the dashboard so nobody misses it. */
const UpcomingBirthdays = ({ featured = false }: { featured?: boolean }) => {
  const [greeting, setGreeting] = useState<Person | null>(null);
  const { data: people } = useQuery({
    queryKey: ["birthdays-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, photo_url, birthday, song_url")
        .eq("active", true)
        .eq("approved", true)
        .not("birthday", "is", null);
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  if (!people || people.length === 0) return null;

  const upcoming = people
    .map((p) => ({ person: p, date: nextOccurrence(p.birthday!), days: daysFromToday(nextOccurrence(p.birthday!)) }))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days);

  const recent = people
    .map((p) => ({ person: p, date: lastOccurrence(p.birthday!), days: -daysFromToday(lastOccurrence(p.birthday!)) }))
    .filter((x) => x.days >= 1 && x.days <= 7)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0 && recent.length === 0) return null;

  const hero = upcoming[0];
  const others = upcoming.slice(1, 4);
  const lastRecent = recent[0];
  const isToday = hero?.days === 0;

  return (
    <div className={cn("w-full", featured ? "" : "max-w-3xl mt-8")}>
      <div className="flex items-center gap-2 mb-3">
        <Cake className="h-4 w-4 text-accent" />
        <h2 className={cn("font-display tracking-widest text-accent uppercase", featured ? "text-sm" : "text-xs")}>Cumpleaños</h2>
      </div>

      {hero && (
        <div className={cn("glass-card-glow relative overflow-hidden", featured ? "p-6 md:p-8 border-primary/50" : "p-6")}>
          {isToday && (
            <>
              <Balloon delay={0} x="10%" color="🎈" />
              <Balloon delay={0.8} x="30%" color="🎂" />
              <Balloon delay={1.6} x="60%" color="🎉" />
              <Balloon delay={2.4} x="85%" color="🎈" />
            </>
          )}
          <div className="flex items-center gap-5 relative">
            <motion.div
              animate={isToday ? { scale: [1, 1.05, 1] } : undefined}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Avatar className={cn("ring-2 ring-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.4)]", featured ? "h-24 w-24 md:h-32 md:w-32" : "h-20 w-20")}>
                <AvatarImage src={hero.person.photo_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-display">
                  {initials(hero.person.name)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {isToday ? "¡Hoy cumple años!" : "Próximo cumpleaños"}
              </p>
              <p className={cn("font-display truncate", featured ? "text-3xl md:text-5xl font-black text-gold-gradient leading-tight" : "text-xl text-foreground")}>{hero.person.name}</p>
              <p className={cn("text-accent mt-1", featured ? "text-base md:text-lg font-semibold" : "text-sm")}>
                {relativeFuture(hero.days)} · {format(hero.date, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>

          {hero && isBirthdayThisWeek(hero.person.birthday!) && (
            <button
              onClick={() => setGreeting(hero.person)}
              className="btn-space mt-5 w-full rounded-full px-6 py-2.5 text-sm font-display tracking-wider"
            >
              🎉 Volver a ver la felicitación
            </button>
          )}

          {others.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap gap-4">
              {others.map((o) => (
                <div key={o.person.id} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 ring-1 ring-accent/30">
                    <AvatarImage src={o.person.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-secondary/40">
                      {initials(o.person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="text-foreground truncate max-w-[120px]">{o.person.name}</p>
                    <p className="text-muted-foreground">{relativeFuture(o.days)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastRecent && isBirthdayThisWeek(lastRecent.person.birthday!) && (
        <button
          onClick={() => setGreeting(lastRecent.person)}
          className="btn-space mt-3 w-full rounded-full px-6 py-2.5 text-sm font-display tracking-wider"
        >
          🎉 Volver a ver la felicitación de {lastRecent.person.name}
        </button>
      )}

      {lastRecent && (
        <div className="glass-card mt-3 px-4 py-3 flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-1 ring-accent/30">
            <AvatarImage src={lastRecent.person.photo_url ?? undefined} />
            <AvatarFallback className="text-xs bg-secondary/40">
              {initials(lastRecent.person.name)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            {relativePast(lastRecent.days)} celebramos a{" "}
            <span className="text-foreground font-medium">{lastRecent.person.name}</span> 🎉
          </p>
        </div>
      )}
      <AnimatePresence>
        {greeting && (
          <BirthdayGreetingOverlay
            person={{
              id: greeting.id,
              name: greeting.name,
              photo_url: greeting.photo_url,
              song_url: greeting.song_url,
              birthday: greeting.birthday!,
            }}
            onClose={() => setGreeting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpcomingBirthdays;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Person = {
  id: string;
  name: string;
  photo_url: string | null;
  birthday: string | null;
};

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const isBirthdayThisWeek = (birthday: string | null) => {
  if (!birthday) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const [, mm, dd] = birthday.split("-").map(Number);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getMonth() + 1 === mm && d.getDate() === dd) return true;
  }
  return false;
};

const PeopleCarousel = () => {
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);

  const { data: people } = useQuery({
    queryKey: ["people-carousel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, photo_url, birthday")
        .eq("active", true)
        .eq("approved", true)
        .order("name");
      if (error) throw error;
      return data as Person[];
    },
  });

  if (!people || people.length === 0) return null;

  const loop = [...people, ...people];
  const duration = Math.max(20, people.length * 4);

  return (
    <div
      className="w-full overflow-hidden py-2 mb-6"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`flex w-max gap-6 animate-marquee ${paused ? "marquee-paused" : ""}`}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {loop.map((p, i) => (
          <button
            key={`${p.id}-${i}`}
            onClick={() => navigate(`/diploma/${slugify(p.name)}`)}
            className="flex flex-col items-center gap-2 shrink-0 group"
            title={p.name}
          >
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 portal-ring transition-transform duration-300 group-hover:scale-110">
                {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-sm">
                  {p.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isBirthdayThisWeek(p.birthday) && (
                <span className="absolute -top-1 -right-1 text-lg animate-float">🎂</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors max-w-[6rem] truncate">
              {p.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeopleCarousel;

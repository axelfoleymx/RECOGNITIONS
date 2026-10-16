import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StarField from "@/components/StarField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Search, Award, MessageSquare, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import VoteReminderBanner from "@/components/VoteReminderBanner";

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const MyRecognitions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterMine, setFilterMine] = useState(false);

  // Fetch latest closed week
  // Always fetch the most recent week
  const { data: lastWeek } = useQuery({
    queryKey: ["latest-week-for-diplomas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weeks")
        .select("*")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const diplomasReleased = (lastWeek as any)?.diplomas_released === true;

  const weekLabel = lastWeek
    ? `${format(parseISO(lastWeek.start_date), "d MMM", { locale: es })} – ${format(parseISO(lastWeek.end_date), "d MMM yyyy", { locale: es })}`
    : "";

  const { data: recognitions, isLoading } = useQuery({
    queryKey: ["all-recognitions-closed", lastWeek?.id],
    enabled: !!lastWeek?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognitions")
        .select("*, people:recognized_person_id(id, name, photo_url)")
        .eq("week_id", lastWeek!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Group by person
  const grouped = useMemo(() => {
    if (!recognitions) return [];
    const map = new Map<string, { person: any; count: number }>();
    for (const r of recognitions) {
      const p = r.people as any;
      if (!p) continue;
      if (!map.has(p.id)) map.set(p.id, { person: p, count: 0 });
      map.get(p.id)!.count++;
    }
    let entries = Array.from(map.values());

    if (filterMine && user) {
      entries = entries.filter(e =>
        recognitions.some(r => (r.people as any)?.id === e.person.id && r.author_user_id === user.id)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e => e.person.name.toLowerCase().includes(q));
    }

    return entries.sort((a, b) => b.count - a.count);
  }, [recognitions, filterMine, search, user]);

  return (
    <div className="min-h-screen space-gradient relative">
      <StarField />
      <VoteReminderBanner />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6 text-muted-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary tracking-wider mb-1 text-center">
          ✨ Recognitions Estelares
        </h1>
        {weekLabel && (
          <p className="text-muted-foreground text-sm text-center mb-6">
            Semana del {weekLabel}
          </p>
        )}
        {!lastWeek && !isLoading && (
          <p className="text-muted-foreground text-sm text-center mb-6">
            No hay semanas disponibles aún.
          </p>
        )}

        {/* Locked state */}
        {!isLoading && lastWeek && !diplomasReleased && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Los diplomas de esta misión aún no han sido revelados 🚀</p>
            <p className="text-muted-foreground text-sm">Espera a que se presenten los resultados de la semana.</p>
          </motion.div>
        )}

        {diplomasReleased && (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar persona..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-muted/50 border-border"
                />
              </div>
              <Button
                variant={filterMine ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMine(!filterMine)}
                className="shrink-0 text-xs"
              >
                Mis envíos
              </Button>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-4 animate-pulse h-16" />
                ))}
              </div>
            )}

            {!isLoading && grouped.length === 0 && lastWeek && (
              <div className="glass-card p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron reconocimientos.</p>
              </div>
            )}

            <div className="space-y-2">
              {grouped.map((entry, i) => (
                <motion.button
                  key={entry.person.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => navigate(`/diploma/${slugify(entry.person.name)}`)}
                  className="w-full glass-card p-4 flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer text-left group"
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-primary/20 group-hover:border-primary/50 transition-colors">
                    {entry.person.photo_url && <AvatarImage src={entry.person.photo_url} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {entry.person.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{entry.person.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.count} reconocimiento{entry.count !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <Award className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyRecognitions;

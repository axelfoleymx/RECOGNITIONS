import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { Rocket, Star, Users } from "lucide-react";

const WeekPulse = () => {
  const { data: week } = useCurrentWeek();

  const { data: stats } = useQuery({
    queryKey: ["week-pulse", week?.id],
    enabled: !!week?.id,
    queryFn: async () => {
      const [recognitions, votes, people] = await Promise.all([
        supabase.from("recognitions").select("id", { count: "exact", head: true }).eq("week_id", week!.id),
        supabase.from("votes").select("id", { count: "exact", head: true }).eq("week_id", week!.id),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("active", true).eq("approved", true),
      ]);
      return {
        recognitions: recognitions.count ?? 0,
        votes: votes.count ?? 0,
        people: people.count ?? 0,
      };
    },
  });

  const items = [
    { icon: Rocket, label: "Reconocimientos", value: stats?.recognitions ?? 0, color: "text-primary" },
    { icon: Star, label: "Votos emitidos", value: stats?.votes ?? 0, color: "text-accent" },
    { icon: Users, label: "Tripulación", value: stats?.people ?? 0, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-3xl mt-8">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.4 }}
          className="glass-card px-4 py-3 flex flex-col items-center gap-1"
        >
          <item.icon className={`h-4 w-4 ${item.color}`} />
          <span className="font-display text-xl text-foreground">{item.value}</span>
          <span className="text-[11px] text-muted-foreground text-center">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default WeekPulse;

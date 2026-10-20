import { useEffect, useState } from "react";
import { ExternalLink, Trash2, Youtube } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import GameButton from "@/components/game/GameButton";
import { youtubeId } from "@/lib/gamification";

/** "Mi video de victoria": a YouTube link that plays in the presentation if you win Rocketer. */
const VictoryVideo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: person, isLoading } = useQuery({
    queryKey: ["my-person-video", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, youtube_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => setUrl(person?.youtube_url ?? ""), [person?.youtube_url]);

  if (isLoading || !person) return null;

  const id = youtubeId(url);
  const savedId = youtubeId(person.youtube_url);

  const save = async (value: string | null) => {
    setSaving(true);
    const { error } = await supabase.from("people").update({ youtube_url: value }).eq("id", person.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["my-person-video"] });
    toast({ title: value ? "🎬 Video guardado" : "Video eliminado", description: value ? "Se reproducirá si ganas el Rocketer de la semana" : undefined });
  };

  return (
    <div className="cockpit p-4 md:p-5 mt-6 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
          <Youtube className="h-5 w-5 text-destructive" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold tracking-wider">Mi video de victoria</p>
          <p className="text-xs text-muted-foreground">Pega un link de YouTube: sonará en la presentación si ganas el Rocketer. Si ya tenías canción subida y no pones video, se sigue usando tu canción.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="bg-muted/40 h-11"
        />
        <GameButton size="md" variant="gold" disabled={!id || saving || url === person.youtube_url} onClick={() => save(url.trim())}>
          Guardar
        </GameButton>
      </div>
      {url && !id && <p className="text-xs text-destructive mt-1">Ese link no parece de YouTube.</p>}
      {savedId && (
        <div className="flex items-center gap-3 mt-3">
          <img src={`https://img.youtube.com/vi/${savedId}/mqdefault.jpg`} alt="Miniatura del video" className="h-14 rounded-lg border border-border" />
          <a href={person.youtube_url!} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
            Abrir en YouTube <ExternalLink className="h-3 w-3" />
          </a>
          <button onClick={() => save(null)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Quitar video">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VictoryVideo;

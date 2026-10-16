import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { EyeOff, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MyRecognitionsListProps {
  userId: string;
  weekId: string;
}

const MyRecognitionsList = ({ userId, weekId }: MyRecognitionsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  const { data: recognitions, isLoading } = useQuery({
    queryKey: ["my-recognitions", weekId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognitions")
        .select("*, people:recognized_person_id(name, photo_url)")
        .eq("author_user_id", userId)
        .eq("week_id", weekId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!weekId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["recognitions"] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const { error } = await supabase
        .from("recognitions")
        .update({ message })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast({ title: "Reconocimiento actualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recognitions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Reconocimiento eliminado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startEdit = (id: string, currentMessage: string) => {
    setEditingId(id);
    setEditMessage(currentMessage);
  };

  if (isLoading) return null;

  return (
    <div className="glass-card-glow p-6 md:p-8 mt-6">
      <h2 className="font-display text-lg text-primary mb-4 tracking-wider flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> Tus reconocimientos esta semana
      </h2>

      {!recognitions?.length ? (
        <p className="text-muted-foreground text-sm">
          Aún no has enviado reconocimientos esta semana.
        </p>
      ) : (
        <div className="space-y-3">
          {recognitions.map((r, i) => {
            const person = r.people as { name: string; photo_url: string | null } | null;
            const isEditing = editingId === r.id;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-start gap-3"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {person?.photo_url && <AvatarImage src={person.photo_url} />}
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {person?.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{person?.name ?? "Desconocido"}</span>
                    {r.is_anonymous && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <EyeOff className="h-3 w-3" /> Anónimo
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        className="min-h-[80px] bg-muted/50 border-border text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: r.id, message: editMessage })}
                          disabled={!editMessage.trim() || updateMutation.isPending}
                          className="btn-space"
                        >
                          <Check className="h-3 w-3 mr-1" /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm mt-1 break-words">{r.message}</p>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => startEdit(r.id, r.message)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(r.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRecognitionsList;

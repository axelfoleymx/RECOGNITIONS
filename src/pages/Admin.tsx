import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StarField from "@/components/StarField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, Trophy, Users, UserCheck, MessageSquare, FileDown, Plus, Trash2, Pencil, Check, X, Presentation, RotateCcw, Rocket, Lock, Unlock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ImageCropper from "@/components/ImageCropper";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { generatePdf } from "@/lib/generatePdf";
import { Badge } from "@/components/ui/badge";
import CelebrationExperience from "@/components/CelebrationExperience";
import AwardsAdmin from "@/components/game/AwardsAdmin";
import CheckinsAdmin from "@/components/game/CheckinsAdmin";

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Week selection
  const { data: weeks } = useQuery({
    queryKey: ["all-weeks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weeks").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: currentWeek } = useCurrentWeek();
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // /admin?present=1 (button on the home dashboard) opens the presentation directly
  useEffect(() => {
    if (searchParams.get("present") === "1") {
      setShowCelebration(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const activeWeekId = selectedWeekId || currentWeek?.id;
  const activeWeek = weeks?.find((w) => w.id === activeWeekId) || currentWeek;

  // Recognitions
  const { data: recognitions } = useQuery({
    queryKey: ["recognitions", activeWeekId],
    enabled: !!activeWeekId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognitions")
        .select("*, people:recognized_person_id(name, photo_url)")
        .eq("week_id", activeWeekId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch author names separately since FK hint doesn't work with PostgREST cache
      const authorIds = [...new Set(data?.map(r => r.author_user_id).filter(Boolean) as string[])];
      let profilesMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", authorIds);
        profilesMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      }

      return data?.map(r => ({
        ...r,
        profiles: r.author_user_id ? { full_name: profilesMap[r.author_user_id] || "Anónimo" } : null,
      }));
    },
  });

  // Votes
  const { data: votes } = useQuery({
    queryKey: ["votes", activeWeekId],
    enabled: !!activeWeekId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("*, people:voted_person_id(name, photo_url, youtube_url)")
        .eq("week_id", activeWeekId!);
      if (error) throw error;
      return data as any[];
    },
  });

  // Vote counts
  const voteCounts = votes?.reduce((acc, v) => {
    const name = v.people?.name || "Unknown";
    const photoUrl = v.people?.photo_url;
    const songUrl = v.people?.youtube_url;
    if (!acc[v.voted_person_id]) {
      acc[v.voted_person_id] = { name, photoUrl, songUrl, count: 0, reasons: [] };
    }
    acc[v.voted_person_id].count++;
    if (v.reason) acc[v.voted_person_id].reasons.push(v.reason);
    return acc;
  }, {} as Record<string, { name: string; photoUrl: string | null; songUrl: string | null; count: number; reasons: string[] }>);

  const sortedVotes = Object.entries(voteCounts || {}).sort(([, a], [, b]) => (b as any).count - (a as any).count) as [string, { name: string; photoUrl: string | null; songUrl: string | null; count: number; reasons: string[] }][];

  // People management
  const { data: people } = useQuery({
    queryKey: ["people-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("people").select("*") as any).order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  // Profiles for linking person → user
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: async ({ personId, userId }: { personId: string; userId: string | null }) => {
      const { error } = await (supabase.from("people").update({ user_id: userId } as any).eq("id", personId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      toast({ title: "Usuario vinculado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonType, setNewPersonType] = useState("team");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonPhoto, setNewPersonPhoto] = useState<File | Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState("");
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropperSrc(url);
    setCropperOpen(true);
    e.target.value = "";
  };

  const handleCropConfirm = (blob: Blob, previewUrl: string) => {
    setNewPersonPhoto(blob);
    setCroppedPreview(previewUrl);
    setCropperOpen(false);
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setCropperSrc("");
  };

  const addPersonMutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | null = null;
      if (newPersonPhoto) {
        const ext = newPersonPhoto instanceof File ? newPersonPhoto.name.split(".").pop() : "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        await supabase.storage.from("photos").upload(path, newPersonPhoto);
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("people").insert({
        name: newPersonName,
        type: newPersonType,
        photo_url: photoUrl,
        birthday: newPersonBirthday || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      setNewPersonName("");
      setNewPersonBirthday("");
      setNewPersonPhoto(null);
      setCroppedPreview(null);
      toast({ title: "Persona agregada" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("people").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      queryClient.invalidateQueries({ queryKey: ["people-active"] });
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      queryClient.invalidateQueries({ queryKey: ["people-active"] });
      toast({ title: "Persona eliminada" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approvePersonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").update({ approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      queryClient.invalidateQueries({ queryKey: ["people-active"] });
      toast({ title: "Persona aprobada" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updatePersonMutation = useMutation({
    mutationFn: async ({ id, name, type, birthday, photo }: { id: string; name: string; type: string; birthday: string | null; photo?: Blob | null }) => {
      let photoUrl: string | undefined = undefined;
      if (photo) {
        const path = `${crypto.randomUUID()}.jpg`;
        await supabase.storage.from("photos").upload(path, photo);
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const updateData: any = { name, type, birthday: birthday || null };
      if (photoUrl !== undefined) updateData.photo_url = photoUrl;
      const { error } = await supabase.from("people").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      queryClient.invalidateQueries({ queryKey: ["people-active"] });
      setEditingPersonId(null);
      toast({ title: "Persona actualizada" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("team");
  const [editBirthday, setEditBirthday] = useState("");
  const [editPhoto, setEditPhoto] = useState<Blob | null>(null);
  const [editCropperOpen, setEditCropperOpen] = useState(false);
  const [editCropperSrc, setEditCropperSrc] = useState("");
  const [editCroppedPreview, setEditCroppedPreview] = useState<string | null>(null);

  const startEditing = (p: any) => {
    setEditingPersonId(p.id);
    setEditName(p.name);
    setEditType(p.type);
    setEditBirthday(p.birthday || "");
    setEditPhoto(null);
    setEditCroppedPreview(p.photo_url || null);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCropperSrc(URL.createObjectURL(file));
    setEditCropperOpen(true);
    e.target.value = "";
  };

  const handleEditCropConfirm = (blob: Blob, previewUrl: string) => {
    setEditPhoto(blob);
    setEditCroppedPreview(previewUrl);
    setEditCropperOpen(false);
  };

  const deleteRecognitionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recognitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognitions"] });
      toast({ title: "Reconocimiento eliminado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetVotesMutation = useMutation({
    mutationFn: async () => {
      if (!activeWeekId) throw new Error("No hay semana activa");
      const { error } = await supabase.from("votes").delete().eq("week_id", activeWeekId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      toast({ title: "Votos reiniciados", description: "Todos los usuarios deben votar de nuevo" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ---- Users management ----
  const { data: authUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.users as { id: string; email: string; full_name: string; created_at: string; email_confirmed_at: string | null }[];
    },
  });

  const confirmUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-confirm-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuario confirmado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["people-all"] });
      toast({ title: "Usuario eliminado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleGeneratePdf = async () => {
    if (!recognitions || !activeWeek) return;
    try {
      // Build winners data from votes (support ties)
      const maxCount = sortedVotes.length > 0 ? sortedVotes[0][1].count : 0;
      const winnersData = sortedVotes
        .filter(([, v]) => v.count === maxCount && maxCount > 0)
        .map(([id, v]) => ({
          personId: id,
          name: v.name,
          photoUrl: v.photoUrl,
          voteCount: v.count,
          reasons: v.reasons,
        }));
      const allVotedEntries = sortedVotes.map(([id, v]) => ({
        personId: id,
        name: v.name,
        photoUrl: v.photoUrl,
        count: v.count,
        reasons: v.reasons,
      }));
      await generatePdf(recognitions, activeWeek, winnersData.length > 0 ? winnersData : undefined, allVotedEntries.length > 1 ? allVotedEntries : undefined);
      toast({ title: "PDF generado", description: "Se ha descargado la presentación" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen space-gradient flex items-center justify-center relative">
        <StarField />
        <div className="glass-card p-8 text-center z-10">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground">Acceso Denegado</h2>
          <p className="text-muted-foreground mt-2">No tienes permisos de administrador</p>
          <Button onClick={() => navigate("/")} className="mt-4" variant="outline">Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-gradient relative">
      <StarField />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h1 className="font-display text-lg text-primary tracking-wider flex items-center gap-2">
            <Shield className="h-5 w-5" /> Centro de Control
          </h1>
        </div>

        {/* Week selector */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Select value={activeWeekId || ""} onValueChange={setSelectedWeekId}>
            <SelectTrigger className="w-64 bg-muted/50 border-border">
              <SelectValue placeholder="Seleccionar semana" />
            </SelectTrigger>
            <SelectContent>
              {weeks?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {format(parseISO(w.start_date), "d MMM", { locale: es })} – {format(parseISO(w.end_date), "d MMM yyyy", { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeWeek && (
            <Button
              variant={(activeWeek as any).diplomas_released ? "outline" : "default"}
              size="sm"
              className="gap-2"
              onClick={async () => {
                const newVal = !(activeWeek as any).diplomas_released;
                await supabase.from("weeks").update({ diplomas_released: newVal } as any).eq("id", activeWeek.id);
                queryClient.invalidateQueries({ queryKey: ["all-weeks"] });
                toast({ title: newVal ? "🚀 Diplomas liberados" : "🔒 Diplomas bloqueados" });
              }}
            >
              {(activeWeek as any).diplomas_released ? (
                <><Unlock className="h-4 w-4" /> Diplomas Liberados</>
              ) : (
                <><Lock className="h-4 w-4" /> Liberar Diplomas</>
              )}
            </Button>
          )}
        </div>

        <Tabs defaultValue="recognitions" className="space-y-4">
          <TabsList className="bg-muted/50 flex-wrap h-auto">
            <TabsTrigger value="recognitions"><MessageSquare className="h-4 w-4 mr-1" /> Reconocimientos</TabsTrigger>
            <TabsTrigger value="votes"><Trophy className="h-4 w-4 mr-1" /> Votos</TabsTrigger>
            <TabsTrigger value="awards"><Trophy className="h-4 w-4 mr-1" /> Premios</TabsTrigger>
            <TabsTrigger value="checkins">🪞 Autoevaluación</TabsTrigger>
            <TabsTrigger value="people"><Users className="h-4 w-4 mr-1" /> Personas</TabsTrigger>
            <TabsTrigger value="users"><UserCheck className="h-4 w-4 mr-1" /> Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="recognitions" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowCelebration(true)}
                className="btn-space"
                disabled={!recognitions?.length && !sortedVotes.length}
              >
                <Presentation className="h-4 w-4 mr-2" /> Presentar Resultados
              </Button>
              <Button onClick={handleGeneratePdf} className="btn-space" disabled={!recognitions?.length}>
                <FileDown className="h-4 w-4 mr-2" /> Generar PDF
              </Button>
            </div>
            <div className="space-y-3">
              {recognitions?.map((r) => (
                <div key={r.id} className="glass-card p-4 flex gap-4">
                  <Avatar className="h-12 w-12 portal-ring shrink-0">
                    {(r as any).people?.photo_url && <AvatarImage src={(r as any).people.photo_url} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-xs">
                      {((r as any).people?.name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{(r as any).people?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(r.created_at), "d MMM HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{r.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      — {r.is_anonymous ? "Anónimo" : (r as any).profiles?.full_name || "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar este reconocimiento?")) {
                        deleteRecognitionMutation.mutate(r.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!recognitions?.length && (
                <p className="text-center text-muted-foreground py-8">No hay reconocimientos esta semana</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="votes">
            <div className="flex justify-end mb-4">
              <Button
                variant="destructive"
                size="sm"
                disabled={!sortedVotes.length || resetVotesMutation.isPending}
                onClick={() => {
                  if (confirm("¿Reiniciar todos los votos de esta semana? Todos los usuarios deberán votar de nuevo.")) {
                    resetVotesMutation.mutate();
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Votos
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">#</TableHead>
                    <TableHead className="text-foreground">Persona</TableHead>
                    <TableHead className="text-foreground text-right">Votos</TableHead>
                    <TableHead className="text-foreground">Justificaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVotes.map(([id, data], i) => (
                    <TableRow key={id} className={i === 0 ? "bg-primary/10" : ""}>
                      <TableCell>
                        {i === 0 ? <Trophy className="h-5 w-5 text-primary" /> : i + 1}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {data.photoUrl && <AvatarImage src={data.photoUrl} />}
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {data.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={i === 0 ? "text-primary font-bold" : "text-foreground"}>{data.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">{data.count}</TableCell>
                      <TableCell className="max-w-xs">
                        {data.reasons.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {data.reasons.map((r, ri) => (
                              <li key={ri} className="italic truncate">"{r}"</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!sortedVotes.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay votos esta semana
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="checkins">
            {activeWeekId && <CheckinsAdmin weekId={activeWeekId} />}
          </TabsContent>

          <TabsContent value="awards">
            {activeWeekId && <AwardsAdmin weekId={activeWeekId} />}
          </TabsContent>

          <TabsContent value="users">
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Nombre</TableHead>
                    <TableHead className="text-foreground">Email</TableHead>
                    <TableHead className="text-foreground">Registro</TableHead>
                    <TableHead className="text-foreground text-center">Estado</TableHead>
                    <TableHead className="text-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Cargando usuarios...</TableCell>
                    </TableRow>
                  ) : authUsers?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-foreground">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(parseISO(u.created_at), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.email_confirmed_at ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!u.email_confirmed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary"
                              onClick={() => confirmUserMutation.mutate(u.id)}
                              disabled={confirmUserMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" /> Confirmar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!usersLoading && !authUsers?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay usuarios registrados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            {/* Proposed people section */}
            {(() => {
              const proposedPeople = people?.filter((p) => p.approved === false);
              if (!proposedPeople?.length) return null;
              return (
                <div className="glass-card p-4 border border-primary/30">
                  <h3 className="font-display text-sm text-primary mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Personas propuestas por el equipo
                    <Badge className="bg-primary/20 text-primary border-primary/30 ml-2">{proposedPeople.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {proposedPeople.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {p.photo_url && <AvatarImage src={p.photo_url} />}
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {p.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-foreground font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 capitalize">{p.type}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary"
                            onClick={() => approvePersonMutation.mutate(p.id)}
                            disabled={approvePersonMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Aprobar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm("¿Rechazar y eliminar esta persona propuesta?")) deletePersonMutation.mutate(p.id); }}
                            disabled={deletePersonMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Add person form */}
            <div className="glass-card p-4">
              <h3 className="font-display text-sm text-primary mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" /> Agregar Persona
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs text-foreground">Nombre</Label>
                  <Input
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Nombre"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Tipo</Label>
                  <Select value={newPersonType} onValueChange={setNewPersonType}>
                    <SelectTrigger className="w-36 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="proveedor">Proveedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Cumpleaños</Label>
                  <Input
                    type="date"
                    value={newPersonBirthday}
                    onChange={(e) => setNewPersonBirthday(e.target.value)}
                    className="bg-muted/50 border-border w-44"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Foto</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="bg-muted/50 border-border w-48"
                    />
                    {croppedPreview && (
                      <Avatar className="h-10 w-10 portal-ring">
                        <AvatarImage src={croppedPreview} />
                      </Avatar>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => addPersonMutation.mutate()}
                  disabled={!newPersonName.trim() || addPersonMutation.isPending}
                  className="btn-space"
                >
                  Agregar
                </Button>
              </div>
            </div>

            {/* People list - only approved */}
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Persona</TableHead>
                    <TableHead className="text-foreground">Tipo</TableHead>
                    <TableHead className="text-foreground">🎂 Cumpleaños</TableHead>
                    <TableHead className="text-foreground">Usuario vinculado</TableHead>
                    <TableHead className="text-foreground text-center">Activo</TableHead>
                    <TableHead className="text-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people?.filter((p) => p.approved !== false).map((p) => (
                    <TableRow key={p.id}>
                      {editingPersonId === p.id ? (
                        <>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 shrink-0">
                                {editCroppedPreview && <AvatarImage src={editCroppedPreview} />}
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                  {editName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50 border-border h-8 w-36" />
                              <Input type="file" accept="image/*" onChange={handleEditFileSelect} className="bg-muted/50 border-border h-8 w-36 text-xs" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select value={editType} onValueChange={setEditType}>
                              <SelectTrigger className="w-28 h-8 bg-muted/50 border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="team">Team</SelectItem>
                                <SelectItem value="proveedor">Proveedor</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={editBirthday}
                              onChange={(e) => setEditBirthday(e.target.value)}
                              className="bg-muted/50 border-border h-8 w-36 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.user_id || "none"}
                              onValueChange={(val) => linkUserMutation.mutate({ personId: p.id, userId: val === "none" ? null : val })}
                            >
                              <SelectTrigger className="w-44 h-8 bg-muted/50 border-border text-xs">
                                <SelectValue placeholder="Sin vincular" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {allProfiles?.map((prof) => (
                                  <SelectItem key={prof.user_id} value={prof.user_id}>
                                    {prof.full_name} ({prof.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={p.active} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: p.id, active: checked })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => updatePersonMutation.mutate({ id: p.id, name: editName, type: editType, birthday: editBirthday, photo: editPhoto })} disabled={!editName.trim() || updatePersonMutation.isPending}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingPersonId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {p.photo_url && <AvatarImage src={p.photo_url} />}
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                {p.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-foreground">{p.name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground capitalize">{p.type}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(p as any).birthday
                              ? format(parseISO((p as any).birthday), "d MMM", { locale: es })
                              : <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.user_id || "none"}
                              onValueChange={(val) => linkUserMutation.mutate({ personId: p.id, userId: val === "none" ? null : val })}
                            >
                              <SelectTrigger className="w-44 h-8 bg-muted/50 border-border text-xs">
                                <SelectValue placeholder="Sin vincular" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {allProfiles?.map((prof) => (
                                  <SelectItem key={prof.user_id} value={prof.user_id}>
                                    {prof.full_name} ({prof.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={p.active} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: p.id, active: checked })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEditing(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("¿Eliminar esta persona?")) deletePersonMutation.mutate(p.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ImageCropper
        imageSrc={cropperSrc}
        open={cropperOpen}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
      <ImageCropper
        imageSrc={editCropperSrc}
        open={editCropperOpen}
        onConfirm={handleEditCropConfirm}
        onCancel={() => setEditCropperOpen(false)}
      />

      {showCelebration && activeWeek && (
        <CelebrationExperience
          weekLabel={`Semana del ${format(parseISO(activeWeek.start_date), "d MMM", { locale: es })} – ${format(parseISO(activeWeek.end_date), "d MMM yyyy", { locale: es })}`}
          weekId={activeWeek.id}
          recognitions={recognitions || []}
          sortedVotes={sortedVotes.map(([id, data]) => ({
            personId: id,
            name: data.name,
            photoUrl: data.photoUrl,
            count: data.count,
            reasons: data.reasons,
          }))}
          winnerVideoUrl={(() => {
            const maxCount = sortedVotes.length > 0 ? sortedVotes[0][1].count : 0;
            const winners = sortedVotes.filter(([, v]) => v.count === maxCount);
            return winners.length === 1 ? winners[0][1].songUrl : null;
          })()}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
};

export default Admin;

# PARTE 4 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 8 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Encuesta de Recognitions

### Archivo: `src/components/game/RecognitionSurvey.tsx`

~~~tsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import {
  firstName,
  GamePerson,
  MAX_TOP_RATINGS,
  pillarOf,
  RATING_LABELS,
  RECOGNITION_PILLARS,
  SURVEY_QUESTIONS,
  XP,
} from "@/lib/gamification";
import Medal from "./Medal";
import PlayerAvatar from "./PlayerAvatar";
import GameButton from "./GameButton";
import { DraggablePerson } from "./DragPeople";

export type SurveyAnswer = { questionId: string; personId: string; rating: number; comment: string };
export type SurveyExtra = { personId: string; pillar: string; message: string };
export type SurveySubmission = { answers: SurveyAnswer[]; extra: SurveyExtra | null; anonymous: boolean };

interface RecognitionSurveyProps {
  people: GamePerson[];
  myUserId: string | null;
  /** people nobody has recognized this week */
  radarIds: Set<string>;
  /** survey already sent this week → jump straight to the extra medal */
  alreadyDone?: boolean;
  initialPersonId?: string | null;
  onSubmit: (s: SurveySubmission) => Promise<void>;
  onFinish?: () => void;
}

type Pick = { rating: number; comment: string; showComment?: boolean };
const MEDAL_ZONE = "extra-medal";
const EXTRA_STEP = SURVEY_QUESTIONS.length;
const REVIEW_STEP = SURVEY_QUESTIONS.length + 1;

const RocketRating = ({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "md" | "lg" }) => (
  <div className="flex gap-1">
    {[1, 2, 3].map((n) => (
      <motion.button
        key={n}
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onChange(n);
        }}
        aria-label={`${n} cohetes`}
        className={cn(
          "rounded-lg border flex items-center justify-center transition-all",
          size === "lg" ? "h-12 px-3 text-lg" : "h-9 w-9 text-base",
          n <= value ? "border-primary/70 bg-primary/20 shadow-[0_0_12px_hsl(var(--star-gold)/0.4)]" : "border-border bg-muted/40 grayscale opacity-50",
        )}
      >
        {size === "lg" ? "🚀".repeat(n) : "🚀"}
      </motion.button>
    ))}
  </div>
);

const RecognitionSurvey = ({ people, myUserId, radarIds, alreadyDone, initialPersonId, onSubmit, onFinish }: RecognitionSurveyProps) => {
  const [step, setStep] = useState(alreadyDone ? EXTRA_STEP : 0);
  const [answers, setAnswers] = useState<Record<string, Record<string, Pick>>>({});
  const [extraPerson, setExtraPerson] = useState<string | null>(initialPersonId ?? null);
  const [extraPillar, setExtraPillar] = useState("");
  const [extraMessage, setExtraMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const crew = useMemo(
    () =>
      people
        .filter((p) => !(myUserId && p.user_id === myUserId))
        .sort((a, b) => Number(radarIds.has(b.id)) - Number(radarIds.has(a.id)) || a.name.localeCompare(b.name)),
    [people, radarIds, myUserId],
  );
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);

  const q = SURVEY_QUESTIONS[step];
  const current = (q && answers[q.id]) || {};
  const selectedIds = Object.keys(current);
  const ratedAnywhere = useMemo(() => new Set(Object.values(answers).flatMap((a) => Object.keys(a))), [answers]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const topCount = (qa: Record<string, Pick>, except?: string) =>
    Object.entries(qa).filter(([id, p]) => id !== except && p.rating === 3).length;

  const setPick = (personId: string, pick: Pick | null) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      if (pick === null) delete qa[personId];
      else {
        if (pick.rating === 3 && topCount(qa, personId) >= MAX_TOP_RATINGS) {
          flash(`Máximo ${MAX_TOP_RATINGS} personas con 🚀🚀🚀 por pregunta`);
          pick = { ...pick, rating: 2 };
        }
        qa[personId] = pick;
      }
      return { ...all, [q.id]: qa };
    });
  };

  const toggle = (personId: string) => (current[personId] ? setPick(personId, null) : setPick(personId, { rating: 2, comment: "" }));

  const bulkRate = (rating: number) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      let tops = 0;
      let capped = false;
      Object.keys(qa).forEach((id) => {
        let r = rating;
        if (r === 3) {
          if (tops >= MAX_TOP_RATINGS) {
            r = 2;
            capped = true;
          } else tops++;
        }
        qa[id] = { ...qa[id], rating: r };
      });
      if (capped) flash(`Solo ${MAX_TOP_RATINGS} pueden llevar 🚀🚀🚀; el resto quedó en 🚀🚀`);
      return { ...all, [q.id]: qa };
    });
  };

  const selectRadar = () => {
    crew.filter((p) => radarIds.has(p.id) && !current[p.id]).forEach((p) => setPick(p.id, { rating: 2, comment: "" }));
  };

  const onSwipe = (personId: string, info: PanInfo) => {
    if (info.offset.x > 70 && !current[personId]) setPick(personId, { rating: 2, comment: "" });
    if (info.offset.x < -70 && current[personId]) setPick(personId, null);
  };

  const flatAnswers: SurveyAnswer[] = Object.entries(answers).flatMap(([questionId, qa]) =>
    Object.entries(qa).map(([personId, p]) => ({ questionId, personId, rating: p.rating, comment: p.comment.trim() })),
  );
  const extraValid = !!extraPerson && !!extraPillar && extraMessage.trim().length >= 10;
  const canSubmit = flatAnswers.length > 0 || extraValid;

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit({
        answers: flatAnswers,
        extra: extraValid ? { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() } : null,
        anonymous,
      });
      setDone(true);
      setBurst((b) => b + 1);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setStep(EXTRA_STEP);
    setDone(false);
  };

  // ---------------------------------------------------------------- done
  if (done) {
    return (
      <div className="cockpit p-8 md:p-12 flex flex-col items-center text-center gap-4">
        <EmojiBurst triggerSignal={burst} count={30} />
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
          <Medal size={140} emoji="✓" active />
        </motion.div>
        <h2 className="font-display text-2xl md:text-3xl font-black text-gold-gradient">¡Recognitions enviados!</h2>
        <p className="text-muted-foreground max-w-md">
          {flatAnswers.length > 0 && `${flatAnswers.length} calificaciones a ${new Set(flatAnswers.map((a) => a.personId)).size} personas. `}
          Sistema de Recognitions en verde 🟢
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <GameButton variant="gold" onClick={onFinish}>
            🚀 Volver a la nave
          </GameButton>
          <GameButton variant="ghost" onClick={reset}>
            🏅 Dar otra medalla extra
          </GameButton>
        </div>
      </div>
    );
  }

  const steps = [...SURVEY_QUESTIONS.map((x) => x.emoji), "🎁", "✅"];

  return (
    <div className="space-y-5">
      <EmojiBurst triggerSignal={burst} />

      {/* Crew strip — photos on top, missing people loud */}
      <div className="cockpit p-4 relative z-30 select-none">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="hud-label text-foreground/80">
            Tripulación · <span className="text-accent">{crew.filter((p) => radarIds.has(p.id)).length} sin recognition esta semana</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {step === EXTRA_STEP ? "Arrastra una foto a la medalla 🏅" : step < EXTRA_STEP ? "Toca una foto para seleccionarla" : ""}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
          {crew.map((p) => (
            <DraggablePerson
              key={p.id}
              person={p}
              size={radarIds.has(p.id) ? 54 : 42}
              selected={step < EXTRA_STEP ? !!current[p.id] : step === EXTRA_STEP && extraPerson === p.id}
              state={{ highlight: radarIds.has(p.id) && !ratedAnywhere.has(p.id), done: ratedAnywhere.has(p.id), badge: ratedAnywhere.has(p.id) ? "✓" : undefined }}
              onHover={setHover}
              onDrop={(pid, zone) => zone === MEDAL_ZONE && (setExtraPerson(pid), setStep(EXTRA_STEP))}
              onSelect={(pid) => {
                if (step < EXTRA_STEP) toggle(pid);
                else {
                  setExtraPerson(pid);
                  setStep(EXTRA_STEP);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1.5">
        {steps.map((e, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "flex-1 h-10 rounded-lg border font-hud text-sm flex items-center justify-center transition-all",
              i === step ? "border-primary bg-primary/20 shadow-[0_0_16px_hsl(var(--star-gold)/0.4)]" : i < step ? "border-xp/50 bg-xp/10" : "border-border/60 bg-muted/30 opacity-60",
            )}
            aria-label={`Paso ${i + 1}`}
          >
            {i < step && i < EXTRA_STEP && Object.keys(answers[SURVEY_QUESTIONS[i]?.id] || {}).length > 0 ? "✓" : e}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          {/* ------------------------------------------------ questions */}
          {q && (
            <div className="cockpit p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
                <div>
                  <p className="hud-label text-neon">
                    Pregunta {step + 1}/{SURVEY_QUESTIONS.length} ·{" "}
                    <span style={{ color: `hsl(${pillarOf(q.pillar).hue})` }}>{pillarOf(q.pillar).label}</span>
                  </p>
                  <h2 className="font-display text-xl md:text-3xl font-black text-foreground mt-1">
                    {q.emoji} {q.question}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desliza → para seleccionar, ← para quitar · o marca varias casillas y califícalas juntas.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={selectRadar} className="chip border border-accent/50 text-accent hover:bg-accent/10 px-3 py-2">
                    📡 Seleccionar sin recognition
                  </button>
                  {selectedIds.length > 0 && (
                    <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: {} }))} className="chip border border-border text-muted-foreground px-3 py-2">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk rating bar */}
              <AnimatePresence>
                {selectedIds.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="sticky top-16 z-20 mb-3"
                  >
                    <div className="rounded-xl border border-primary/50 bg-background/90 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-3">
                      <span className="font-hud text-sm">
                        Calificar a <strong className="text-primary">{selectedIds.length}</strong> seleccionados:
                      </span>
                      <RocketRating size="lg" value={0} onChange={bulkRate} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {crew.map((p) => {
                  const pick = current[p.id];
                  const radar = radarIds.has(p.id) && !ratedAnywhere.has(p.id);
                  return (
                    <div key={p.id} className="relative rounded-xl overflow-hidden">
                      {/* swipe reveal */}
                      <div className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-xp/40 via-xp/10 to-destructive/30">
                        <span className="font-hud text-xs font-bold text-xp">✓ CALIFICAR →</span>
                        <span className="font-hud text-xs font-bold text-destructive">← QUITAR</span>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.5}
                        onDragEnd={(_, info) => onSwipe(p.id, info)}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          "relative flex flex-wrap items-center gap-3 px-3 py-2.5 cursor-pointer border rounded-xl transition-colors",
                          pick ? "bg-[hsl(256_40%_14%)] border-primary/60" : radar ? "bg-[hsl(256_40%_10%)] border-accent/50" : "bg-[hsl(256_40%_9%)] border-border/50",
                        )}
                        style={{ touchAction: "pan-y" }}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={!!pick} onCheckedChange={() => toggle(p.id)} className="h-6 w-6" aria-label={`Seleccionar a ${p.name}`} />
                        </div>
                        <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={44} ring={pick ? "gold" : radar ? "cyan" : "none"} className={radar && !pick ? "radar-pulse" : undefined} />
                        <div className="flex-1 min-w-[120px]">
                          <p className="font-semibold leading-tight">{p.name}</p>
                          {radar && <p className="font-hud text-[11px] text-accent font-bold">📡 NADIE LE HA RECONOCIDO ESTA SEMANA</p>}
                          {pick && <p className="font-hud text-[11px] text-primary">{RATING_LABELS[pick.rating]}</p>}
                        </div>
                        {pick && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <RocketRating value={pick.rating} onChange={(r) => setPick(p.id, { ...pick, rating: r })} />
                            <button
                              onClick={() => setPick(p.id, { ...pick, showComment: !pick.showComment })}
                              className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", pick.comment ? "border-accent text-accent" : "border-border text-muted-foreground")}
                              aria-label="Agregar comentario"
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {pick?.showComment && (
                          <div className="basis-full" onClick={(e) => e.stopPropagation()}>
                            <Input
                              autoFocus
                              value={pick.comment}
                              onChange={(e) => setPick(p.id, { ...pick, comment: e.target.value })}
                              placeholder={`Comentario para ${firstName(p.name)} (opcional)`}
                              maxLength={200}
                              className="bg-muted/40 h-10"
                            />
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ extra medal */}
          {step === EXTRA_STEP && (
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
              <div
                data-dropzone={MEDAL_ZONE}
                className={cn(
                  "cockpit p-6 flex flex-col items-center justify-center min-h-[320px] transition-shadow",
                  hover === MEDAL_ZONE && "shadow-[0_0_0_2px_hsl(var(--star-gold)/0.7),0_0_50px_hsl(var(--star-gold)/0.4)]",
                )}
              >
                <p className="hud-label text-neon mb-2">🎁 Extra · medalla especial</p>
                <div className="relative">
                  <Medal size={130} active={hover === MEDAL_ZONE || !!extraPerson} emoji={extraPerson ? "" : "★"} />
                  <AnimatePresence>
                    {extraPerson && byId[extraPerson] && (
                      <motion.div
                        key={extraPerson}
                        initial={{ scale: 0, y: -60 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 14 }}
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: 130 * 1.4 * 0.68 - 34 }}
                      >
                        <PlayerAvatar name={byId[extraPerson].name} photoUrl={byId[extraPerson].photo_url} size={68} ring="gold" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="font-display text-lg text-gold-gradient mt-2 text-center">
                  {extraPerson ? byId[extraPerson]?.name : "Arrastra aquí una foto"}
                </p>
                {extraPerson && (
                  <button onClick={() => setExtraPerson(null)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" /> Quitar
                  </button>
                )}
              </div>
              <div className={cn("cockpit p-5 space-y-4", !extraPerson && "opacity-50 pointer-events-none")}>
                <p className="text-sm text-muted-foreground">
                  ¿Alguien hizo algo que no cabe en las preguntas? Dale una medalla con tu propio mensaje. <span className="text-xp">+{XP.giveRecognition} XP</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RECOGNITION_PILLARS.map((id) => {
                    const pm = pillarOf(id);
                    const on = extraPillar === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setExtraPillar(id)}
                        className={cn("rounded-xl border px-3 py-2 text-left text-xs font-hud font-semibold transition-all", on ? "" : "border-border/60 bg-muted/30")}
                        style={on ? { borderColor: `hsl(${pm.hue})`, background: `hsl(${pm.hue} / 0.15)`, color: `hsl(${pm.hue})` } : undefined}
                      >
                        <span className="text-lg mr-1">{pm.emoji}</span> {pm.label}
                      </button>
                    );
                  })}
                </div>
                <Textarea
                  value={extraMessage}
                  onChange={(e) => setExtraMessage(e.target.value)}
                  placeholder="Sé concreto: qué hizo, para qué cliente, qué resultado…"
                  maxLength={400}
                  className="min-h-[110px] bg-muted/40"
                />
              </div>
            </div>
          )}

          {/* ------------------------------------------------ review */}
          {step === REVIEW_STEP && (
            <div className="cockpit p-5 md:p-6 space-y-4">
              <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient">Revisión antes de despegar</h2>
              {SURVEY_QUESTIONS.map((qq, i) => {
                const qa = answers[qq.id] || {};
                const ids = Object.keys(qa);
                return (
                  <button key={qq.id} onClick={() => setStep(i)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                    <p className="text-sm font-semibold">
                      {qq.emoji} {qq.question}
                    </p>
                    {ids.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Nadie seleccionado</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ids.map((id) => (
                          <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-2.5 py-0.5">
                            <PlayerAvatar name={byId[id]?.name || "?"} photoUrl={byId[id]?.photo_url} size={22} ring="none" />
                            <span className="text-xs">{firstName(byId[id]?.name || "")}</span>
                            <span className="text-[10px]">{"🚀".repeat(qa[id].rating)}</span>
                            {qa[id].comment && <span className="text-[10px]">💬</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-semibold">🎁 Medalla extra</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {extraValid ? `${byId[extraPerson!]?.name} · ${pillarOf(extraPillar).label}` : "Sin medalla extra (opcional)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
                <Label htmlFor="anon" className="text-sm text-muted-foreground">
                  Enviar como anónimo
                </Label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 flex items-center gap-3">
        <GameButton variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="shrink-0">
          <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Atrás</span>
        </GameButton>
        {step < REVIEW_STEP ? (
          <GameButton variant={step < EXTRA_STEP && selectedIds.length === 0 ? "ghost" : "cyan"} size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
            {step < EXTRA_STEP
              ? selectedIds.length === 0
                ? "Nadie esta vez"
                : `Siguiente · ${selectedIds.length} seleccionados`
              : extraValid
                ? "Revisar"
                : "Saltar extra"}
            <ChevronRight className="h-5 w-5" />
          </GameButton>
        ) : (
          <GameButton variant="gold" size="lg" className="flex-1" onClick={submit} disabled={!canSubmit || sending}>
            {sending ? "Lanzando…" : (
              <>
                <Check className="h-5 w-5" /> Enviar recognitions · +{XP.completeSurvey} XP
              </>
            )}
          </GameButton>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-40 lg:bottom-24 left-1/2 -translate-x-1/2 z-[70] chip bg-primary text-primary-foreground px-4 py-2 text-sm shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecognitionSurvey;
~~~

---

Paso 9 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Recognitions y Rocketer

`src/pages/Recognize.tsx` y `src/pages/Vote.tsx` reemplazan a los actuales.

### Archivo: `src/pages/Recognize.tsx`

~~~tsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekRecognitions } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import GameShell from "@/components/game/GameShell";
import RecognitionSurvey, { SurveySubmission } from "@/components/game/RecognitionSurvey";
import { questionOf } from "@/lib/gamification";
import type { TablesInsert } from "@/integrations/supabase/types";
import MyRecognitionsList from "@/components/MyRecognitionsList";
import ImageCropper from "@/components/ImageCropper";
import { UserPlus } from "lucide-react";

const Recognize = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: weekRecs = [] } = useWeekRecognitions(week?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // "Not in the list" — add a guest person (pending admin approval)
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState("");
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const radarIds = useMemo(() => {
    const got = new Set(weekRecs.map((r) => r.recognized_person_id));
    return new Set(people.filter((p) => p.approved !== false && !got.has(p.id)).map((p) => p.id));
  }, [people, weekRecs]);

  const addPerson = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      let photoUrl: string | null = null;
      if (croppedBlob) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("photos").upload(path, croppedBlob);
        if (uploadErr) throw uploadErr;
        photoUrl = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("people")
        .insert({ name: newName.trim(), type: "team", photo_url: photoUrl, approved: false })
        .select()
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["people-active"] });
      setAddedId(data.id);
      setShowNew(false);
      setNewName("");
      setCroppedBlob(null);
      setCroppedPreview(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const surveyDone = weekRecs.some((r) => r.author_user_id === user?.id && r.question_id);

  const onSubmit = async ({ answers, extra, anonymous }: SurveySubmission) => {
    if (!week || !user) throw new Error("No week or user");
    const rows: TablesInsert<"recognitions">[] = answers.map((a) => {
      const q = questionOf(a.questionId)!;
      return {
        week_id: week.id,
        recognized_person_id: a.personId,
        author_user_id: user.id,
        is_anonymous: anonymous,
        message: a.comment || q.statement,
        pillar: q.pillar,
        question_id: a.questionId,
        rating: a.rating,
      };
    });
    if (extra) {
      rows.push({
        week_id: week.id,
        recognized_person_id: extra.personId,
        author_user_id: user.id,
        is_anonymous: anonymous,
        message: extra.message,
        pillar: extra.pillar,
        question_id: null,
        rating: null,
      });
    }
    const { error } = await supabase.from("recognitions").insert(rows);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["my-recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
    queryClient.invalidateQueries({ queryKey: ["week-pulse"] });
  };

  return (
    <GameShell>
      <div className="mb-6">
        <p className="hud-label text-neon">Sistema 2 · Recognitions</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Recognitions de la Semana</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          5 preguntas rápidas: selecciona a quienes destacaron (desliza o marca varios a la vez), califícalos con 🚀 y, si quieres,
          deja un comentario. Al final puedes dar una medalla extra.
        </p>
      </div>

      <RecognitionSurvey
        people={people.filter((p) => p.approved !== false || p.id === addedId)}
        myUserId={user?.id ?? null}
        radarIds={radarIds}
        alreadyDone={surveyDone}
        initialPersonId={addedId ?? params.get("to")}
        onSubmit={onSubmit}
        onFinish={() => navigate("/")}
      />

      <div className="glass-card p-4 mt-5">
        {!showNew ? (
          <button onClick={() => setShowNew(true)} className="text-sm text-muted-foreground hover:text-accent flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> ¿La persona no está en la lista? Agrégala
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" className="bg-muted/40" />
            <Input
              type="file"
              accept="image/*"
              className="bg-muted/40"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCropperSrc(URL.createObjectURL(file));
                setCropperOpen(true);
                e.target.value = "";
              }}
            />
            {croppedPreview && (
              <Avatar className="h-10 w-10 portal-ring">
                <AvatarImage src={croppedPreview} />
              </Avatar>
            )}
            <Button onClick={addPerson} disabled={!newName.trim() || adding} className="btn-space">
              {adding ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        )}
      </div>

      {user && week && (
        <div className="max-w-3xl mx-auto">
          <MyRecognitionsList userId={user.id} weekId={week.id} />
        </div>
      )}

      <ImageCropper
        imageSrc={cropperSrc}
        open={cropperOpen}
        onConfirm={(blob, previewUrl) => {
          setCroppedBlob(blob);
          setCroppedPreview(previewUrl);
          setCropperOpen(false);
        }}
        onCancel={() => {
          setCropperOpen(false);
          setCropperSrc("");
        }}
      />
    </GameShell>
  );
};

export default Recognize;
~~~

### Archivo: `src/components/game/RocketerArena.tsx`

~~~tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, RotateCcw, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { GamePerson, XP } from "@/lib/gamification";
import Trophy from "./Trophy";
import PlayerAvatar from "./PlayerAvatar";
import { PeopleTray } from "./DragPeople";

interface RocketerArenaProps {
  people: GamePerson[];
  myUserId: string | null;
  /** recent winners that can't receive Rocketer votes */
  cooldownIds: Set<string>;
  existing?: { personId: string; reason: string } | null;
  locked?: boolean;
  onVote: (personId: string, reason: string) => Promise<void>;
  onAnnul: () => Promise<void>;
}

const ZONE = "rocketer";

const RocketerArena = ({ people, myUserId, cooldownIds, existing, locked, onVote, onAnnul }: RocketerArenaProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const shown = existing ? byId[existing.personId] : personId ? byId[personId] : null;

  const drop = (pid: string, zone: string) => {
    if (zone !== ZONE || existing || locked) return;
    const p = byId[pid];
    if (p && myUserId && p.user_id === myUserId) return flash("No puedes votarte a ti mismo/a 😉");
    if (cooldownIds.has(pid)) return flash("❄️ En cooldown: fue Rocketer hace poco. ¡Dale chance a alguien más!");
    setPersonId(pid);
  };

  const flash = (msg: string) => {
    setWarning(msg);
    setTimeout(() => setWarning(null), 2800);
  };

  const valid = reason.trim().length >= 10;

  return (
    <div className="space-y-6">
      <EmojiBurst triggerSignal={burst} count={30} />

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-stretch">
        <div
          data-dropzone={ZONE}
          onClick={() => {
            if (selected) {
              drop(selected, ZONE);
              setSelected(null);
            }
          }}
          className={cn(
            "relative overflow-hidden rounded-3xl border p-6 min-h-[380px] flex flex-col items-center justify-center",
            "bg-[radial-gradient(circle_at_50%_40%,hsl(var(--neon-violet)/0.35),transparent_65%)] bg-card/70",
            hover === ZONE || selected
              ? "border-neon-violet shadow-[0_0_0_2px_hsl(var(--neon-violet)/0.7),0_0_70px_hsl(var(--neon-violet)/0.45)]"
              : "border-neon-violet/40",
          )}
        >
          <span className="hud-label text-neon-violet">Mega trofeo</span>
          <div className="relative mt-2">
            <Trophy size={190} emoji={shown ? undefined : "🚀"} variant="mega" active={hover === ZONE || !!shown} />
            <AnimatePresence>
              {shown && (
                <motion.div
                  key={shown.id}
                  initial={{ scale: 0, y: -90 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  className="absolute left-1/2 -translate-x-1/2 top-6"
                >
                  <PlayerAvatar name={shown.name} photoUrl={shown.photo_url} size={104} ring="gold" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient mt-3 text-center">
            {shown ? shown.name : "Rocketer de la Semana"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mt-1 max-w-sm">
            El MVP de la semana: quien más impulsó al equipo y al cliente. Quien ganó en las últimas 3 semanas está en ❄️ cooldown.
          </p>
          {personId && !existing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPersonId(null);
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="glass-card p-5 md:p-6 flex flex-col justify-center gap-4">
          {existing ? (
            <div className="text-center space-y-3">
              <Lock className="h-10 w-10 text-accent mx-auto" />
              <h3 className="font-display text-lg">Voto registrado</h3>
              {existing.reason && (
                <p className="text-sm italic text-foreground/90 glass-card p-3 text-left">“{existing.reason}”</p>
              )}
              {!locked && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("¿Anular tu voto para votar de nuevo?")) return;
                    setBusy(true);
                    try {
                      await onAnnul();
                      setPersonId(null);
                      setReason("");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Anular y votar de nuevo
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="hud-label">¿Por qué es el Rocketer? *</p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={personId ? "Cuenta el impacto concreto: qué logró, para qué cliente, qué resultado…" : "Primero arrastra a alguien al mega trofeo"}
                disabled={!personId}
                maxLength={500}
                className="min-h-[140px] bg-muted/40"
              />
              <p className={cn("text-xs font-hud", valid ? "text-muted-foreground" : "text-destructive/80")}>
                {reason.trim().length}/10 caracteres mínimos
              </p>
              <Button
                disabled={!personId || !valid || busy || locked}
                className="btn-space h-12 font-display tracking-wider"
                onClick={async () => {
                  if (!personId) return;
                  setBusy(true);
                  try {
                    await onVote(personId, reason.trim());
                    setBurst((b) => b + 1);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Enviando..." : `⭐ Confirmar voto · +${XP.castRocketerVote} XP`}
              </Button>
            </>
          )}
        </div>
      </div>

      {!existing && !locked && (
        <PeopleTray
          people={people}
          selectedId={selected}
          onSelect={setSelected}
          onHover={setHover}
          onDrop={drop}
          stateFor={(p) => {
            if (myUserId && p.user_id === myUserId) return { disabled: true, badge: "Tú" };
            if (cooldownIds.has(p.id)) return { disabled: true, badge: "❄️", hint: "En cooldown (Rocketer reciente)" };
            return undefined;
          }}
        />
      )}

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[70] chip bg-destructive text-destructive-foreground px-4 py-2 text-sm"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RocketerArena;
~~~

### Archivo: `src/pages/Vote.tsx`

~~~tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useRecentRocketers } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import RocketerArena from "@/components/game/RocketerArena";
import { timeLeft } from "@/lib/gamification";

const Vote = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: cooldown = new Set<string>() } = useRecentRocketers(week?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingVote } = useQuery({
    queryKey: ["my-vote", week?.id],
    enabled: !!week && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("*, people:voted_person_id(name)")
        .eq("week_id", week!.id)
        .eq("voter_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-vote"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
    queryClient.invalidateQueries({ queryKey: ["week-pulse"] });
  };

  return (
    <GameShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
        <div>
          <p className="hud-label text-neon">Boss final</p>
          <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">
            Votar Rocketer de la Semana
          </h1>
        </div>
        {week && (
          <div className="glass-card px-4 py-2 text-right">
            <p className="hud-label">Cierra en</p>
            <p className="font-display text-xl text-primary">{timeLeft(week.end_date).label}</p>
          </div>
        )}
      </div>

      <RocketerArena
        people={people.filter((p) => p.approved !== false)}
        myUserId={user?.id ?? null}
        cooldownIds={cooldown}
        locked={week?.status !== "open"}
        existing={existingVote ? { personId: existingVote.voted_person_id, reason: existingVote.reason } : null}
        onVote={async (personId, reason) => {
          if (!week || !user) return;
          const { error } = await supabase.from("votes").insert({
            week_id: week.id,
            voter_user_id: user.id,
            voted_person_id: personId,
            reason,
          });
          if (error) {
            toast({ title: "No se pudo votar", description: error.message, variant: "destructive" });
            throw error;
          }
          toast({ title: "¡Voto registrado!", description: "Tu voto ha sido enviado 🌟" });
          refresh();
        }}
        onAnnul={async () => {
          if (!existingVote) return;
          const { error } = await supabase.from("votes").delete().eq("id", existingVote.id);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            throw error;
          }
          refresh();
        }}
      />
    </GameShell>
  );
};

export default Vote;
~~~

---


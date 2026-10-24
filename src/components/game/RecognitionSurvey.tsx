import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, Plus, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { GamePerson, pillarOf, RATING_LABELS, RECOGNITION_PILLARS, shortNames, SurveyQuestion, XP } from "@/lib/gamification";
import Medal from "./Medal";
import PlayerAvatar from "./PlayerAvatar";
import GameButton from "./GameButton";
import { DraggablePerson } from "./DragPeople";

export type SurveyAnswer = { questionId: string; personId: string; rating: number; comment: string };
export type SurveyExtra = { personId: string; pillar: string; message: string };
export type SurveySubmission = { answers: SurveyAnswer[]; extras: SurveyExtra[]; anonymous: boolean };

interface RecognitionSurveyProps {
  people: GamePerson[];
  myUserId: string | null;
  /** one question per award of the week */
  questions: SurveyQuestion[];
  /** people nobody has recognized this week */
  radarIds: Set<string>;
  /** people added this session (shown with a "Nuevo" tag) */
  newPersonIds?: Set<string>;
  /** a person just added: selected in the current question */
  autoSelectId?: string | null;
  /** survey already sent this week → open on the free medals */
  alreadyDone?: boolean;
  initialPersonId?: string | null;
  onAddPerson?: () => void;
  onSubmit: (s: SurveySubmission) => Promise<void>;
  onFinish?: () => void;
}

type Pick = { rating: number; comment: string; showComment?: boolean };
const MEDAL_ZONE = "extra-medal";

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
        aria-label={`${n} ${n === 1 ? "cohete" : "cohetes"}: ${RATING_LABELS[n]}`}
        className={cn(
          "rounded-lg border flex items-center justify-center transition-all",
          size === "lg" ? "h-11 px-3 text-base" : "h-9 w-9 text-base",
          n <= value ? "border-primary/70 bg-primary/20 shadow-[0_0_12px_hsl(var(--star-gold)/0.4)]" : "border-border bg-muted/40 grayscale opacity-50",
        )}
      >
        {size === "lg" ? "🚀".repeat(n) : "🚀"}
      </motion.button>
    ))}
  </div>
);

const RecognitionSurvey = ({
  people,
  myUserId,
  questions,
  radarIds,
  newPersonIds,
  autoSelectId,
  alreadyDone,
  initialPersonId,
  onAddPerson,
  onSubmit,
  onFinish,
}: RecognitionSurveyProps) => {
  const EXTRA_STEP = questions.length;
  const REVIEW_STEP = questions.length + 1;
  const [step, setStep] = useState(alreadyDone || initialPersonId ? EXTRA_STEP : 0);
  const [answers, setAnswers] = useState<Record<string, Record<string, Pick>>>({});
  const [extras, setExtras] = useState<SurveyExtra[]>([]);
  const [extraPerson, setExtraPerson] = useState<string | null>(initialPersonId ?? null);
  const [extraPillar, setExtraPillar] = useState("");
  const [extraMessage, setExtraMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);

  const crew = useMemo(
    () =>
      people
        .filter((p) => !(myUserId && p.user_id === myUserId))
        .sort(
          (a, b) =>
            Number(!!newPersonIds?.has(b.id)) - Number(!!newPersonIds?.has(a.id)) ||
            Number(radarIds.has(b.id)) - Number(radarIds.has(a.id)) ||
            a.name.localeCompare(b.name),
        ),
    [people, radarIds, myUserId, newPersonIds],
  );
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const labels = useMemo(() => shortNames(crew), [crew]);
  const radarCount = crew.filter((p) => radarIds.has(p.id)).length;
  // At the start of the week everybody is "missing": highlighting all of them means nothing.
  const radarMeaningful = radarCount > 0 && radarCount <= Math.ceil(crew.length / 2);

  const q = questions[step];
  const current = (q && answers[q.id]) || {};
  const selectedIds = Object.keys(current);
  const ratedAnywhere = useMemo(() => new Set(Object.values(answers).flatMap((a) => Object.keys(a))), [answers]);

  const setPick = (personId: string, pick: Pick | null) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      if (pick === null) delete qa[personId];
      else qa[personId] = pick;
      return { ...all, [q.id]: qa };
    });
  };

  // A person added from "+ Agregar integrante" lands selected in the current question
  useEffect(() => {
    if (!autoSelectId) return;
    if (step < EXTRA_STEP) setPick(autoSelectId, { rating: 2, comment: "" });
    else setExtraPerson(autoSelectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectId]);

  const toggle = (personId: string) => (current[personId] ? setPick(personId, null) : setPick(personId, { rating: 2, comment: "" }));

  const bulkRate = (rating: number) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      Object.keys(qa).forEach((id) => (qa[id] = { ...qa[id], rating }));
      return { ...all, [q.id]: qa };
    });
  };

  const selectRadar = () => crew.filter((p) => radarIds.has(p.id) && !current[p.id]).forEach((p) => setPick(p.id, { rating: 2, comment: "" }));

  const onSwipe = (personId: string, info: PanInfo) => {
    if (info.offset.x > 70 && !current[personId]) setPick(personId, { rating: 2, comment: "" });
    if (info.offset.x < -70 && current[personId]) setPick(personId, null);
  };

  const flatAnswers: SurveyAnswer[] = Object.entries(answers).flatMap(([questionId, qa]) =>
    Object.entries(qa).map(([personId, p]) => ({ questionId, personId, rating: p.rating, comment: p.comment.trim() })),
  );
  const draftValid = !!extraPerson && !!extraPillar && extraMessage.trim().length >= 10;
  const allExtras = draftValid ? [...extras, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }] : extras;
  const canSubmit = flatAnswers.length > 0 || allExtras.length > 0;

  const addMedal = () => {
    if (!draftValid) return;
    setExtras((l) => [...l, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }]);
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setBurst((b) => b + 1);
  };

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit({ answers: flatAnswers, extras: allExtras, anonymous });
      setDone(true);
      setBurst((b) => b + 1);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setExtras([]);
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
          {flatAnswers.length > 0 && `${flatAnswers.length} ${flatAnswers.length === 1 ? "voto" : "votos"} en los premios de la semana. `}
          {allExtras.length > 0 && `${allExtras.length} medalla${allExtras.length !== 1 ? "s" : ""} extra. `}
          Sistema de Recognitions en verde 🟢
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <GameButton variant="gold" onClick={onFinish}>
            🚀 Volver a la nave
          </GameButton>
          <GameButton variant="ghost" onClick={reset}>
            🏅 Dar más medallas
          </GameButton>
        </div>
      </div>
    );
  }

  const steps = [
    ...questions.map((x) => ({ emoji: x.emoji, label: x.short })),
    { emoji: "🏅", label: "Medallas" },
    { emoji: "✅", label: "Enviar" },
  ];

  const AnonToggle = (
    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 pl-3 pr-2 py-1.5 cursor-pointer select-none">
      <span className="text-sm">{anonymous ? "🕶️ Anónimo" : "🙋 Con mi nombre"}</span>
      <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="Enviar como anónimo" />
    </label>
  );

  return (
    <div className="space-y-4">
      <EmojiBurst triggerSignal={burst} />

      {/* Steps + anonymous mode, always on top so the question is in view right away */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-stretch gap-1.5 flex-1 overflow-x-auto pb-1" role="tablist" aria-label="Pasos de la encuesta">
          {steps.map((s, i) => {
            const answered = i < EXTRA_STEP && Object.keys(answers[questions[i]?.id] || {}).length > 0;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={i === step}
                aria-label={`Paso ${i + 1}: ${s.label}${answered ? " (contestado)" : ""}`}
                onClick={() => setStep(i)}
                className={cn(
                  "min-w-[56px] flex-1 rounded-lg border px-1 py-1.5 flex flex-col items-center justify-center transition-all",
                  i === step ? "border-primary bg-primary/20 shadow-[0_0_16px_hsl(var(--star-gold)/0.4)]" : answered ? "border-xp/50 bg-xp/10" : "border-border/60 bg-muted/30 opacity-70",
                )}
              >
                <span className="text-base leading-none">{answered && i !== step ? "✓" : s.emoji}</span>
                <span className="font-hud text-[10px] leading-tight mt-0.5 truncate max-w-full">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="shrink-0">{AnonToggle}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
          {/* ------------------------------------------------ award questions */}
          {q && (
            <div className="cockpit p-4 md:p-6">
              <p className="hud-label text-neon">
                Premio {step + 1} de {questions.length} ·{" "}
                <span style={{ color: `hsl(${pillarOf(q.pillar).hue})` }}>{pillarOf(q.pillar).label}</span>
              </p>
              <h2 className="font-display text-xl md:text-3xl font-black text-foreground mt-1 text-balance">
                {q.emoji} {q.question}
              </h2>
              {q.description && <p className="text-sm text-foreground/80 mt-1">{q.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Toca o desliza → a quien se lo ganó y califica: 🚀 bien · 🚀🚀 muy bien · 🚀🚀🚀 épico. Puedes elegir a varios.
              </p>

              <div className="flex flex-wrap gap-2 mt-3 mb-3">
                {onAddPerson && (
                  <button onClick={onAddPerson} className="chip border border-primary/50 text-primary hover:bg-primary/10 px-3 py-2">
                    <UserPlus className="h-3.5 w-3.5" /> Agregar integrante
                  </button>
                )}
                {radarMeaningful && (
                  <button onClick={selectRadar} className="chip border border-accent/50 text-accent hover:bg-accent/10 px-3 py-2">
                    📡 Elegir a quienes aún no tienen recognition ({radarCount})
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: {} }))} className="chip border border-border text-muted-foreground px-3 py-2">
                    Limpiar
                  </button>
                )}
              </div>

              <AnimatePresence>
                {selectedIds.length >= 2 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sticky top-16 z-20 mb-3">
                    <div className="rounded-xl border border-primary/50 bg-background/90 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-3">
                      <span className="font-hud text-sm">
                        Calificar a los <strong className="text-primary">{selectedIds.length}</strong> seleccionados:
                      </span>
                      <RocketRating size="lg" value={0} onChange={bulkRate} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {crew.map((p) => {
                  const pick = current[p.id];
                  const radar = radarMeaningful && radarIds.has(p.id) && !ratedAnywhere.has(p.id);
                  const isNew = !!newPersonIds?.has(p.id);
                  return (
                    <div key={p.id} className="relative rounded-xl overflow-hidden">
                      <div aria-hidden className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-xp/40 via-xp/10 to-destructive/30">
                        <span className="font-hud text-xs font-bold text-xp">✓ ELEGIR →</span>
                        <span className="font-hud text-xs font-bold text-destructive">← QUITAR</span>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.5}
                        onDragEnd={(_, info) => onSwipe(p.id, info)}
                        onClick={() => toggle(p.id)}
                        role="checkbox"
                        aria-checked={!!pick}
                        aria-label={`${p.name}${pick ? `, ${RATING_LABELS[pick.rating]}` : ""}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggle(p.id);
                          }
                        }}
                        className={cn(
                          "relative flex flex-wrap items-center gap-3 px-3 py-2.5 cursor-pointer border rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          pick ? "bg-[hsl(256_40%_14%)] border-primary/60" : radar ? "bg-[hsl(256_40%_10%)] border-accent/40" : "bg-[hsl(256_40%_9%)] border-border/50",
                        )}
                        style={{ touchAction: "pan-y" }}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0",
                            pick ? "border-primary bg-primary text-primary-foreground" : "border-primary/60",
                          )}
                        >
                          {pick && <Check className="h-4 w-4" />}
                        </span>
                        <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={44} ring={pick ? "gold" : radar ? "cyan" : "none"} />
                        <div className="flex-1 min-w-[120px]">
                          <p className="font-semibold leading-tight">
                            {p.name}
                            {isNew && <span className="chip bg-primary/20 text-primary text-[10px] px-2 py-0 ml-2 align-middle">Nuevo</span>}
                          </p>
                          {pick ? (
                            <p className="font-hud text-[11px] text-primary">{RATING_LABELS[pick.rating]}</p>
                          ) : (
                            radar && <p className="text-[11px] text-accent">📡 Aún sin recognition esta semana</p>
                          )}
                        </div>
                        {pick && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <RocketRating value={pick.rating} onChange={(r) => setPick(p.id, { ...pick, rating: r })} />
                            <button
                              onClick={() => setPick(p.id, { ...pick, showComment: !pick.showComment })}
                              className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", pick.comment ? "border-accent text-accent" : "border-border text-muted-foreground")}
                              aria-label={`Agregar comentario para ${p.name}`}
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
                              placeholder={`¿Qué hizo ${labels[p.id] || p.name}? (opcional)`}
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

          {/* ------------------------------------------------ free medals (unlimited) */}
          {step === EXTRA_STEP && (
            <div className="space-y-4">
              <div className="cockpit p-4 relative z-30 select-none">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="hud-label text-foreground/80">Medallas libres · reconoce por lo que tú quieras</span>
                  <span className="text-xs text-muted-foreground">Arrastra una foto a la medalla o tócala</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
                  {crew.map((p) => (
                    <DraggablePerson
                      key={p.id}
                      person={p}
                      label={labels[p.id]}
                      size={44}
                      selected={extraPerson === p.id}
                      state={{ done: extras.some((x) => x.personId === p.id) || ratedAnywhere.has(p.id), badge: newPersonIds?.has(p.id) ? "Nuevo" : undefined }}
                      onHover={setHover}
                      onDrop={(pid, zone) => zone === MEDAL_ZONE && setExtraPerson(pid)}
                      onSelect={(pid) => setExtraPerson(pid)}
                    />
                  ))}
                  {onAddPerson && (
                    <button onClick={onAddPerson} className="flex flex-col items-center gap-1 w-[76px]" aria-label="Agregar integrante">
                      <span className="h-11 w-11 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center text-primary">
                        <Plus className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] text-primary">Agregar</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
                <div
                  data-dropzone={MEDAL_ZONE}
                  className={cn(
                    "cockpit p-6 flex flex-col items-center justify-center min-h-[300px] transition-shadow",
                    hover === MEDAL_ZONE && "shadow-[0_0_0_2px_hsl(var(--star-gold)/0.7),0_0_50px_hsl(var(--star-gold)/0.4)]",
                  )}
                >
                  <div className="relative">
                    <Medal size={120} active={hover === MEDAL_ZONE || !!extraPerson} emoji={extraPerson ? "" : "★"} />
                    <AnimatePresence>
                      {extraPerson && byId[extraPerson] && (
                        <motion.div
                          key={extraPerson}
                          initial={{ scale: 0, y: -60 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 14 }}
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{ top: 120 * 1.4 * 0.68 - 32 }}
                        >
                          <PlayerAvatar name={byId[extraPerson].name} photoUrl={byId[extraPerson].photo_url} size={64} ring="gold" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="font-display text-lg text-gold-gradient mt-2 text-center">
                    {extraPerson ? byId[extraPerson]?.name : "Elige a alguien"}
                  </p>
                  {extraPerson && (
                    <button onClick={() => setExtraPerson(null)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" /> Quitar
                    </button>
                  )}
                </div>
                <div className={cn("cockpit p-5 space-y-4", !extraPerson && "opacity-50 pointer-events-none")}>
                  <p className="text-sm text-muted-foreground">
                    ¿Algo que no cabe en los premios? Dale una medalla con tu propio mensaje. Puedes dar todas las que quieras.{" "}
                    <span className="text-xp">+{XP.giveRecognition} XP c/u</span>
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
                    className="min-h-[100px] bg-muted/40"
                  />
                  <GameButton variant="cyan" size="md" className="w-full" disabled={!draftValid} onClick={addMedal}>
                    <Plus className="h-4 w-4" /> Agregar esta medalla
                  </GameButton>
                </div>
              </div>

              {extras.length > 0 && (
                <div className="cockpit p-4">
                  <p className="hud-label mb-2">Medallas listas para enviar ({extras.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((x, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-1.5 py-0.5">
                        <PlayerAvatar name={byId[x.personId]?.name || "?"} photoUrl={byId[x.personId]?.photo_url} size={22} ring="none" />
                        <span className="text-xs">{labels[x.personId] || byId[x.personId]?.name}</span>
                        <span className="text-xs">{pillarOf(x.pillar).emoji}</span>
                        <button onClick={() => setExtras((l) => l.filter((_, j) => j !== i))} aria-label="Quitar medalla" className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------ review */}
          {step === REVIEW_STEP && (
            <div className="cockpit p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient">Revisión antes de despegar</h2>
                {AnonToggle}
              </div>
              {questions.map((qq, i) => {
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
                            <span className="text-xs">{labels[id] || byId[id]?.name}</span>
                            <span className="text-[10px]">{"🚀".repeat(qa[id].rating)}</span>
                            {qa[id].comment && <span className="text-[10px]">💬</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <button onClick={() => setStep(EXTRA_STEP)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                <p className="text-sm font-semibold">🏅 Medallas libres</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {allExtras.length ? allExtras.map((x) => labels[x.personId] || byId[x.personId]?.name).join(", ") : "Sin medallas (opcional)"}
                </p>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 flex items-center gap-3">
        {step > 0 && (
          <GameButton variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} className="shrink-0" aria-label="Atrás">
            <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Atrás</span>
          </GameButton>
        )}
        {step < REVIEW_STEP ? (
          <GameButton variant={step < EXTRA_STEP && selectedIds.length === 0 ? "ghost" : "cyan"} size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
            {step < EXTRA_STEP
              ? selectedIds.length === 0
                ? "Nadie esta vez"
                : `Siguiente · ${selectedIds.length} elegido${selectedIds.length !== 1 ? "s" : ""}`
              : "Revisar y enviar"}
            <ChevronRight className="h-5 w-5" />
          </GameButton>
        ) : (
          <GameButton variant="gold" size="lg" className="flex-1" onClick={submit} disabled={!canSubmit || sending}>
            {sending ? "Lanzando…" : (
              <>
                <Check className="h-5 w-5" /> Enviar · +{XP.completeSurvey} XP
              </>
            )}
          </GameButton>
        )}
      </div>
    </div>
  );
};

export default RecognitionSurvey;

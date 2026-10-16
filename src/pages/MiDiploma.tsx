import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StarField from "@/components/StarField";
import VoteReminderBanner from "@/components/VoteReminderBanner";
import CertificateCard from "@/components/CertificateCard";
import Confetti from "@/components/celebration/Confetti";
import EmojiBurst from "@/components/EmojiBurst";
import { Button } from "@/components/ui/button";
import { Rocket, MessageCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import BirthdayGreetingOverlay from "@/components/BirthdayGreetingOverlay";

const birthdayInWeek = (birthday: string, start: string, end: string) => {
  const [, mm, dd] = birthday.split("-").map(Number);
  const from = parseISO(start);
  const to = parseISO(end);
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getMonth() + 1 === mm && d.getDate() === dd) return true;
  }
  return false;
};

interface DiplomaData {
  person: { id: string; name: string; photo_url: string | null; birthday?: string | null; song_url?: string | null };
  week: { id: string; start_date: string; end_date: string };
  recognitions: { message: string; is_anonymous: boolean }[];
  summary: string | null;
}

const MiDiploma = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DiplomaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [emojiBurstSignal, setEmojiBurstSignal] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchDiploma = async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("generate-summary", {
          body: { mode: "diploma", slug },
        });
        if (fnError) throw fnError;
        if (result?.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (e: any) {
        setError(e.message || "Error al cargar el diploma");
      } finally {
        setLoading(false);
      }
    };
    fetchDiploma();
  }, [slug]);

  const dateRange = data?.week
    ? `${format(parseISO(data.week.start_date), "d MMM", { locale: es })} – ${format(parseISO(data.week.end_date), "d MMM yyyy", { locale: es })}`
    : "";

  const hasBirthday = !!(
    data?.person.birthday &&
    data?.week &&
    birthdayInWeek(data.person.birthday, data.week.start_date, data.week.end_date)
  );

  return (
    <div className="min-h-screen space-gradient relative">
      <StarField />
      <EmojiBurst triggerSignal={emojiBurstSignal} count={28} />
      <VoteReminderBanner />
      <div className="relative z-10 flex flex-col items-center px-4 py-12 md:py-20">
        <div className="w-full max-w-3xl mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-primary gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Rocket className="h-6 w-6 text-primary" />
          <span className="font-display text-sm text-primary tracking-wider">Rocketing Recognitions</span>
        </div>

        {loading && (
          <div className="w-full max-w-xl space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center max-w-md"
          >
            <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </motion.div>
        )}

        {!loading && !error && data && !showCertificate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary text-center tracking-wider">
              ¡Tienes un diploma estelar!
            </h1>
            <p className="text-muted-foreground text-center max-w-md">
              {data.person.name}, tu tripulación te ha dejado mensajes. Pulsa el botón para revelar tu certificado de logro.
            </p>
            <Button
              size="lg"
              onClick={() => { setShowCertificate(true); setEmojiBurstSignal((s) => s + 1); }}
              className="gap-2 font-display tracking-wider text-sm"
            >
              <Rocket className="h-5 w-5" />
              Revelar Diploma
            </Button>
          </motion.div>
        )}

        <AnimatePresence>
          {showCertificate && data && (
            <>
              <Confetti count={100} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-2xl space-y-10"
              >
                {hasBirthday && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card-glow p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
                  >
                    <p className="text-sm md:text-base text-foreground/90">
                      🎂 Además, esta semana fue tu cumpleaños 🎈✨
                    </p>
                    <Button
                      onClick={() => setShowGreeting(true)}
                      className="gap-2 font-display tracking-wider text-xs shrink-0"
                    >
                      Ver mi felicitación
                    </Button>
                  </motion.div>
                )}

                <div onClick={() => setEmojiBurstSignal((s) => s + 1)} className="cursor-pointer">
                  <CertificateCard
                    employeeName={data.person.name}
                    summaryText={data.summary || "Tu luz ha guiado a la tripulación esta semana."}
                    dateRange={dateRange}
                    photoUrl={data.person.photo_url}
                  />
                </div>

                {/* Individual messages */}
                {data.recognitions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <h3 className="font-display text-sm tracking-wider text-accent text-center mb-4 uppercase">
                      🚀 Mensajes de la tripulación estelar
                    </h3>
                    <div className="space-y-3">
                      {data.recognitions.map((rec, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.4 + i * 0.15 }}
                          className="glass-card p-4 flex items-start gap-3"
                        >
                          <MessageCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="text-foreground/90 text-sm leading-relaxed">{rec.message}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showGreeting && data?.person.birthday && (
          <BirthdayGreetingOverlay
            person={{
              id: data.person.id,
              name: data.person.name,
              photo_url: data.person.photo_url,
              song_url: data.person.song_url ?? null,
              birthday: data.person.birthday,
            }}
            onClose={() => setShowGreeting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiDiploma;

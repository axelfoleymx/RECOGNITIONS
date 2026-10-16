import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, slug, messages, traits } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (mode === "diploma") {
      // Find person by slug
      const { data: people } = await supabase.from("people").select("id, name, photo_url, birthday, song_url").eq("active", true);
      const person = people?.find(
        (p: any) => p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") === slug
      );
      if (!person) {
        return new Response(JSON.stringify({ error: "Persona no encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the most recent week (any status)
      const { data: weeks } = await supabase
        .from("weeks")
        .select("id, start_date, end_date, diplomas_released")
        .order("end_date", { ascending: false })
        .limit(1);

      const week = weeks?.[0];

      // Check if diplomas are released
      if (week && !week.diplomas_released) {
        return new Response(JSON.stringify({ error: "Los diplomas de esta misión aún no están disponibles 🚀", person }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!week) {
        return new Response(JSON.stringify({ error: "No hay semanas disponibles", person }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get recognitions for this person in that week
      const { data: recognitions } = await supabase
        .from("recognitions")
        .select("message, is_anonymous, author_user_id")
        .eq("recognized_person_id", person.id)
        .eq("week_id", week.id);

      if (!recognitions || recognitions.length === 0) {
        return new Response(JSON.stringify({ person, week, recognitions: [], summary: null }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate AI summary
      const prompt = `Eres un narrador cósmico de la agencia espacial "Rocketing". 
Se te dan mensajes de reconocimiento que compañeros de trabajo escribieron para ${person.name}.
Crea un resumen emotivo y positivo (máximo 3 oraciones) usando metáforas espaciales.
Usa un tono cálido, celebratorio y cósmico. No repitas los mensajes textualmente, sintetiza su esencia.
Ejemplo de tono: "Tu energía ha sido el combustible que impulsó a la tripulación esta semana..."

Mensajes:
${recognitions.map((r: any) => `- "${r.message}"`).join("\n")}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Eres un escritor creativo de la agencia espacial Rocketing. Respondes solo con el resumen, sin prefijos ni explicaciones." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429 || status === 402) {
          return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
            status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const summary = aiData.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ person, week, recognitions, summary }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "team-traits") {
      const traitsList = traits || [
        { emoji: "🔭", title: "Exploradores" },
        { emoji: "💡", title: "Innovadores" },
        { emoji: "🚀", title: "Impulsores" },
        { emoji: "⭐", title: "Estrellas en ascenso" },
        { emoji: "🔗", title: "Sincronizados" },
        { emoji: "👨‍🚀", title: "Astronautas Estelares" },
      ];

      // Get recent recognitions
      const { data: recentRecognitions } = await supabase
        .from("recognitions")
        .select("message")
        .order("created_at", { ascending: false })
        .limit(30);

      const messagesText = recentRecognitions?.map((r: any) => r.message).join("\n- ") || "No hay reconocimientos recientes.";

      const prompt = `Eres un narrador cósmico de la agencia espacial "Rocketing".
Basándote en estos mensajes de reconocimiento recientes del equipo, genera una descripción breve (1 oración, máx 15 palabras) para cada uno de estos rasgos del equipo:

${traitsList.map((t: any) => `- ${t.title}`).join("\n")}

Mensajes del equipo:
- ${messagesText}

Responde SOLO con un JSON array de objetos con campos "title" y "description". Sin markdown, sin explicación.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Respondes solo con JSON válido, sin markdown ni explicaciones." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit" : "AI error" }), {
          status: status === 429 || status === 402 ? status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "[]";
      // Strip markdown fences if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let descriptions: any[];
      try {
        descriptions = JSON.parse(content);
      } catch {
        descriptions = traitsList.map((t: any) => ({ title: t.title, description: "Navegando juntos por el cosmos." }));
      }

      const result = traitsList.map((t: any, i: number) => ({
        ...t,
        description: descriptions[i]?.description || "Navegando juntos por el cosmos.",
      }));

      return new Response(JSON.stringify({ traits: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

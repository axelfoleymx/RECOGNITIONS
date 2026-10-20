# Rocketing Recognitions 2.0 — Propuesta de RH + Gamificación

## 1. Diagnóstico (lo que está pasando hoy)

| Síntoma | Causa de fondo |
|---|---|
| Hay compañeros que **ya no dejan recognitions** | El sistema premia *recibir*, no *dar*. Si nunca te reconocen, dar se siente como trabajo sin retorno. |
| **Siempre ganan los mismos** el Rocketer | Un solo premio semanal + voto libre = concurso de popularidad ("club de Toby"). La gente vota por amistad, no por desempeño. |
| La presentación **se hace eterna** | Un slide por cada recognition. Con 30+ mensajes, la junta se vuelve lectura en voz alta. |
| **No es cuantificable** | Los mensajes son texto libre sin categoría, sin intensidad, sin vínculo a resultados reales. |

## 2. Principios de diseño

1. **Muchos ganadores, criterios claros.** 5 mini-awards por semana (rotan) + el Rocketer. Más oportunidades = más personas reconocidas.
2. **Votar por conducta, no por persona.** Cada premio describe un comportamiento observable (puntualidad, entregas a tiempo, atención al cliente…).
3. **Dar vale más que recibir.** El XP se gana sobre todo participando. Quien reconoce, vota y registra hitos sube de nivel aunque no gane premios.
4. **Reglas anti-favoritismo** (aplicadas en base de datos, no solo en pantalla):
   - Nadie puede votarse a sí mismo.
   - Un votante puede dar **máximo 2 de los 5 premios** a la misma persona → obliga a repartir.
   - **Cooldown del Rocketer:** quien ganó en las últimas 3 semanas no puede volver a recibir votos de Rocketer.
5. **Radar de tripulación.** El inicio muestra quién no ha recibido reconocimiento esta semana y da una misión extra por reconocerle.
6. **Hitos objetivos.** Además de opiniones, se registran logros reales de la semana (entregas, clientes, resultados de campaña) con sus participantes. Aparecen en la presentación y dan XP a cada participante.
7. **Presentación condensada.** Recognitions agrupados por persona (6 por slide, con contador, pilares y la mejor frase), luego hitos, luego los 5 premios, y al final el Rocketer.

## 3. Catálogo de premios (pensado para una agencia de marketing)

Cada semana se activan 5 de forma automática (rotación por "menos usado"); el admin puede cambiarlos.

| Pilar | Premio | Qué se evalúa |
|---|---|---|
| Actitud | ⏰ El/La Más Puntual | Llega a tiempo a juntas, calls y entregas |
| Productividad | ✅ Deadline Killer | Termina lo que empieza, en tiempo y forma |
| Cliente | 💬 Héroe del Cliente | Responde rápido, resuelve y deja al cliente feliz |
| Actitud | 🌞 Buena Vibra | Contagia buena actitud y levanta al equipo |
| Emprendedor | 🚀 Iniciativa Emprendedora | Propone y ejecuta sin que se lo pidan |
| Creatividad | 🎨 Mente Creativa | La idea, copy o diseño más brillante |
| Resultados | 📈 Data Wizard | Decide con datos y mueve métricas |
| Colaboración | 🤝 Team Player | Ayuda a que otros saquen su trabajo |
| Cliente | 🔥 Apagafuegos | Resolvió una urgencia o crisis |
| Productividad | 🎯 Cero Retrabajos | Calidad impecable a la primera |
| Emprendedor | 💰 Cierra Tratos | Ganó, retuvo o creció una cuenta |
| Crecimiento | 📚 Aprendiz Imparable | Aprendió y compartió algo nuevo |

## 4. Votación par a par con nivel de cohetes

Arrastras la foto de un compañero al trofeo dorado del premio, eliges **1, 2 o 3 cohetes** (qué tan fuerte fue lo que hizo) y opcionalmente el "por qué". El puntaje del premio = suma de cohetes, no solo cantidad de votos. Esto da un número comparable semana contra semana.

## 5. Sistema de XP, niveles y logros

**XP por acción**

| Acción | XP |
|---|---|
| Dar un recognition | +10 |
| Votar un premio | +5 c/u |
| Votar Rocketer | +10 |
| Registrar un hito | +15 |
| Participar en un hito | +10 |
| Recibir un recognition | +5 |
| Ganar un mini-award | +30 |

**Niveles:** Cadete → Piloto (100) → Navegante (250) → Comandante (500) → Capitán Estelar (900) → Leyenda (1500).

**Misiones semanales:** dar 3 recognitions · votar los 5 premios · votar Rocketer · reconocer a alguien del Radar · registrar o sumarte a un hito.

**Logros (mini-awards por hitos personales):** Primer Despegue, Embajador (10 recognitions dados), Explorador (reconociste a 5 personas distintas), Votante Total, Multitarea (3 hitos), Coleccionista (3 premios ganados), Rocketer.

## 6. KPIs para RH

- **% de participación** (personas que dieron al menos 1 recognition / total del equipo). Meta: > 80 %.
- **Cobertura**: % del equipo que recibió al menos 1 recognition en la semana. Meta: > 70 %.
- **Concentración**: % de recognitions que se lleva el top 3. Si sube de 40 %, hay favoritismo.
- **Hitos por semana** y personas involucradas.
- **Distribución de cohetes por pilar** → muestra en qué somos fuertes como agencia y dónde no.

## 7. Implementación

- Migración SQL: `supabase/migrations/20261016000000_gamification.sql`.
- Nuevas pantallas: `/awards` (5 premios drag & drop), `/recognize` (drag al trofeo), `/vote` (Rocketer), `/milestones` (hitos).
- Admin → pestaña **Premios** para elegir los 5 premios de la semana y ver resultados.
- Presentación: fases nuevas (Hitos, Premios) y recognitions condensados.

---

## v2 — Ajustes después de la primera revisión

### Tablero de despegue (inicio)
La semana es una **misión con 5 sistemas**: Premios · Recognitions · Rocketer · Hitos · Autoevaluación. Cada uno es un botón grande con luz de estado (🔴 pendiente / 🟡 en progreso / 🟢 listo), barra de progreso y XP. El siguiente pendiente brilla con la etiqueta **SIGUIENTE**. El cohete se carga de combustible por cada sistema completado y, al 100 %, aparece el botón **¡DESPEGAR!** con animación.

### Recognitions = encuesta rápida (antes "Kudos")
- 5 preguntas: ¿Quién entregó todo a tiempo? · ¿Quién brilló con el cliente? · ¿Quién te ayudó o te salvó el día? · ¿Quién contagió buena actitud? · ¿Quién propuso o resolvió algo sin que se lo pidieran?
- Las personas aparecen como **lista**: deslizas → para seleccionar y ← para quitar, o marcas varias casillas y las calificas **todas a la vez** (1–3 🚀). Cada una puede llevar un comentario opcional.
- Antiinflación: máximo **3 personas con 🚀🚀🚀 por pregunta**. La encuesta da XP fijo (+25), así que seleccionar a todos no da más puntos.
- **Fotos arriba**: quien no ha recibido recognition aparece más grande, con anillo pulsante y la etiqueta "SIN RECOG."; en la lista va primero y hay un botón "📡 Seleccionar sin recognition".
- **Extra**: al final arrastras una foto a una **medalla** (no trofeo) y escribes un mensaje libre.

### Autoevaluación (vale ½ frente a un voto externo)
- Velocímetro: 🐢 *Bajo mi velocidad* · 🛰️ *Velocidad crucero* · ⚡ *Di el máximo*.
- "Esta semana fui bajo mi velocidad porque…" / "…siento que di el máximo porque…", qué te frenó (chips) y qué necesitas para la próxima.
- Vinculas los **hitos** que respaldan tu semana.
- Te calificas en las 5 preguntas; cada 🚀 propio vale **0.5** en el ranking.
- Privada: la ven tú y los admins (Admin → Autoevaluación). En la presentación solo se ven totales del equipo y los bloqueos más comunes.

### Premios
- **1 premio extra por semana** para todo el equipo: el primero que lo propone le pone nombre, emoji y descripción.
- **Autonominación**: puedes nominarte en 1 premio por semana; vale ½.

### Presentación (más ágil)
Pulso de autoevaluación → Hitos → **ranking animado por pregunta** (5 slides) → muro de medallas y comentarios (solo mensajes escritos) → premios → Rocketer.

Migración: `supabase/migrations/20261016100000_gamification_v2.sql` (aplicar después de la v1).

---

## v3 — Clima del equipo (indicador principal de la autoevaluación)

- La autoevaluación abre con **"¿Cómo te sentiste esta semana?"** en una escala de caritas: 🤩 ¡Wow! · 😊 Feliz · 😐 Normal · 😕 Desanimado · 😢 Triste.
- **Índice de clima** (estilo eNPS): % de 🤩 y 😊 menos % de 😕 y 😢, de −100 a +100. Lectura: ≥ 50 Excelente · ≥ 20 Bueno · ≥ 0 Regular · < 0 Necesita atención.
- Es **anónimo**: en la Nave y en la presentación solo se ve el total y la distribución de caritas, nunca nombres.
- **Empatía:** si hay caritas tristes, el equipo ve "N compañeros no tuvieron una buena semana; un café, una ayuda o un recognition hacen la diferencia". Cada quien puede marcar "me gustaría que alguien me eche la mano" (solo lo ve RH; en Admin → Autoevaluación aparecen primero).
- La velocidad ("bajo mi velocidad porque…") se mantiene como pregunta secundaria.
- Meta sugerida: índice de clima ≥ +30 y que nadie que pidió apoyo pase la semana sin seguimiento.

Migración: `supabase/migrations/20261019000000_mood_pulse.sql`.

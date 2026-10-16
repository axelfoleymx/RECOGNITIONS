Este repositorio ya trae el rediseño completo de Rocketing Recognitions (versión gamificada tipo cabina de nave). El código ya está escrito y probado; NO lo reescribas ni cambies el diseño. Tu trabajo es conectarlo con el backend actual sin perder datos.

REGLAS IMPORTANTES
1. Usa el MISMO proyecto de Supabase que ya está conectado. No crees un proyecto nuevo ni cambies las variables de .env.
2. NO borres ni reinicies datos: conserva la tabla people (empleados actuales, fotos, cumpleaños), profiles, user_roles, weeks, recognitions, votes y los archivos de storage. Los empleados actuales deben seguir apareciendo tal cual.
3. El LOGIN se queda igual: misma pantalla /login, mismo Supabase Auth, mismos usuarios y contraseñas, misma restricción de correos @rocketing.agency, mismo reseteo de contraseña. No cambies nada de autenticación.
4. Los admins actuales siguen siendo admins (tabla user_roles).

MIGRACIONES (aplícalas en este orden, son aditivas: solo agregan tablas y columnas)
- supabase/migrations/20261016000000_gamification.sql  → premios semanales, votos con cohetes, hitos, cooldown del Rocketer
- supabase/migrations/20261016100000_gamification_v2.sql → encuesta de recognitions, autoevaluación (vale ½), premio extra semanal, autonominación
- supabase/migrations/20261016200000_victory_video.sql → columna people.youtube_url (video de victoria)
Después regenera los tipos de Supabase y confirma que src/integrations/supabase/types.ts incluye: award_categories, week_awards, award_votes, milestones, milestone_participants, self_checkins, people.youtube_url, recognitions.question_id / rating / pillar, y las funciones ensure_week_awards, propose_week_award, get_recent_rocketers, get_checkin_pulse.

PRESENTACIÓN (solo admin)
- El admin inicia la presentación desde el botón "🎬 Iniciar presentación" en el inicio (Nave) o en Admin → "Presentar Resultados". Debe abrir en pantalla completa.
- Orden de la presentación: intro → cumpleaños → pulso de autoevaluación → hitos → ranking por cada pregunta de recognitions → muro de medallas/comentarios → premios de la semana → top votados → suspenso → ganador Rocketer → cierre.
- MÚSICA DE FONDO: no la quites. Usa los archivos que ya están en public/audio: Award_Music_Winner.mp3 (fondo general), Redoble_de_Tambores.mp3 (suspenso) y Winner_Reveal.mp3 (cierre). Deben seguir el control de volumen/mute de la presentación.
- VIDEO DE VICTORIA: ya no se sube canción MP3. Cada empleado pega un link de YouTube en "Mi video de victoria" (inicio). Si gana el Rocketer (sin empate), en la revelación se reproduce el video embebido con autoplay y aparece un botón "Abrir en YouTube"; mientras suena el video se pausa la música de fondo, y vuelve en el cierre. Si no tiene video, suena Winner_Reveal.mp3.

QUÉ DEBE FUNCIONAR (verifícalo con un usuario normal y uno admin)
- Inicio "Nave": tablero con 5 sistemas (Premios, Recognitions, Rocketer, Hitos, Autoevaluación), barra de combustible y botón ¡DESPEGAR! al completar los 5.
- /awards: arrastrar foto al trofeo, 1–3 cohetes, máximo 2 premios por persona, 1 autonominación (vale ½), y 1 premio extra por semana para todo el equipo.
- /recognize: encuesta de 5 preguntas en lista (deslizar o selección masiva), comentario opcional, medalla extra al final; fotos arriba con quienes no tienen recognition resaltados.
- /vote: Rocketer con cooldown de 3 semanas y sin auto-voto.
- /milestones: hitos con participantes.
- /checkin: autoevaluación privada (velocímetro, "porque…", bloqueos, hitos, auto-calificación ½). Admin la ve en Admin → Autoevaluación.
- Admin → Premios: elegir los premios activos de la semana y ver resultados.
- Las páginas existentes siguen igual: /my-recognitions (Mi Diploma), /diploma/:slug, /reset-password, Admin → Personas/Usuarios, generación de PDF.

NO HAGAS
- No cambies estilos, colores, fuentes ni textos del rediseño.
- No elimines la ruta /demo (solo existe en desarrollo, no aparece en producción).
- No borres el bucket "songs" ni la columna people.song_url (quedan por compatibilidad).

Cuando termines, dime qué migraciones aplicaste y si alguna falló, con el error exacto.

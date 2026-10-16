# Plan: Inicio más vivo y espacial

Tres mejoras pedidas más algunas propuestas extra, todas en la página de inicio.

## 1. Cielo estelar animado con estrellas fugaces

- Estrellas con parpadeo en varias capas y ligero desplazamiento (efecto profundidad), no todas iguales.
- Estrellas fugaces que cruzan la pantalla cada cierto tiempo, en ángulo y con estela luminosa.
- Un par de destellos/nebulosas suaves de fondo para dar color sin distraer.
- Todo respeta la preferencia del sistema de "reducir movimiento".

## 2. "El equipo Rocketing es..." que cambie cada vez

- Hoy los 6 rasgos son siempre los mismos (Exploradores, Innovadores, ...). Se creará una lista amplia de rasgos espaciales con su emoji, y en cada carga se eligen 6 al azar.
- Las descripciones se seguirán generando con IA a partir de los reconocimientos recientes, así que el texto también cambia.
- Se añade un botón discreto "Regenerar" para pedir otra tanda al momento.
- Además, la tanda se guarda por semana para que todo el equipo vea lo mismo dentro del mismo día, pero cambie de semana a semana.

## 3. Carrusel de personas arriba del título

- Fila de círculos con las fotos del equipo que se desplaza sola, en bucle infinito y suave.
- Se pausa al pasar el cursor; al hacer clic en una persona se va a su diploma.
- Detalles: anillo neón, brillo en hover, indicador 🎂 si cumple años esa semana.
- En móvil también se puede arrastrar con el dedo.

## Propuestas extra de mejora

- **Saludo personalizado**: "Buenos días, Axel 👋" con la semana actual y un contador de días para el cierre de votación.
- **Pulso de la semana**: contadores animados de reconocimientos enviados y votos emitidos esta semana, para motivar participación.
- **Últimos reconocimientos**: 2-3 mensajes recientes en tarjetas que rotan, como muestra viva de lo que pasa.
- **Micro-interacciones**: las 3 tarjetas principales con brillo que sigue al cursor y un leve efecto de inclinación.
- **Orden y jerarquía**: agrupar el contenido inferior (cumpleaños, canción, rasgos del equipo) con más aire y títulos consistentes.

## 4. Recordatorio de voto persistente en toda la plataforma

- Barra fija en la parte superior de todas las pantallas internas mientras la persona no haya votado y la semana esté abierta: "Aún no votas por tu Rocketer de la semana" con botón "Votar ahora".
- No se puede cerrar de forma permanente; si se oculta, reaparece al cambiar de pantalla (recordatorio suave pero insistente).
- En la pantalla de enviar reconocimiento: aviso destacado arriba del formulario y, al enviar el reconocimiento, un mensaje de éxito que invita directamente a votar.
- En "Mi Diploma" y en el inicio se mantiene el mismo aviso, con el mismo estilo, para que sea reconocible.
- Cuando ya votó, todos los avisos desaparecen y se muestra la confirmación actual.

## Detalle técnico


- `StarField.tsx`: capas parametrizadas + componente de estrellas fugaces con `framer-motion`; `prefers-reduced-motion` desactiva animaciones.
- `TeamTraits.tsx`: catálogo local de ~20 rasgos, selección aleatoria con semilla por semana, envío de `traits` al Edge Function (ya acepta ese parámetro, sin cambios de backend), botón de regenerar.
- Nuevo `PeopleCarousel.tsx`: consulta `people` activos/aprobados, marquee CSS duplicado para bucle perfecto, `pause on hover`, enlace a `/diploma/:slug`.
- Nuevos widgets de saludo y estadísticas: consultas ligeras a `recognitions` y `votes` de la semana actual.
- Sin cambios de esquema ni de políticas de acceso.
- Nuevo hook `usePendingVote` (semana actual + voto propio) y componente `VoteReminderBanner` reutilizado en `Index`, `Recognize`, `MyRecognitions` y `MiDiploma`.


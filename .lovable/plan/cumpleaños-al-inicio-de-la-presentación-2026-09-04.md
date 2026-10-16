# Cumpleaños al inicio de la presentación

## Objetivo
Cuando alguien del equipo cumple años dentro de la semana actual (lunes a domingo), lo primero que aparece al iniciar la presentación es la felicitación de cumpleaños. Si no hay cumpleaños esa semana, la presentación pasa directo a los reconocimientos.

## Cómo se verá

1. **Slide de felicitación (primera de todas)**
   - Foto grande de la persona con marco brillante.
   - Título "¡FELIZ CUMPLEAÑOS!" grande e impactante, inspirado en la imagen que mandaste (letras redondeadas y gruesas, serpentinas, estrellas y globos alrededor), pero adaptado al estilo espacial actual: fondo oscuro estelar, brillos neón y tipografía Orbitron, con los tonos pastel del cartel como acentos.
   - El pastel de la segunda imagen se usa como elemento gráfico central, flotando debajo de la felicitación con animación suave.
   - Muchísimo confeti cayendo de forma continua (más denso que ahora), serpentinas y globos subiendo.
   - Debajo de la felicitación, un video de cumpleaños de YouTube elegido al azar entre los dos enlaces que compartiste, reproduciéndose automáticamente.
   - Al hacer clic en cualquier parte de la pantalla salta una explosión extra de confeti/emojis.
   - Botón claro: **"Terminar felicitación"** → pasa a los reconocimientos.
2. Si hay varios cumpleaños en la misma semana, se muestra una slide por persona y el botón avanza a la siguiente hasta terminar.
3. Sin cumpleaños en la semana → la presentación arranca en los reconocimientos como siempre.

## Notas

- Se mantiene la slide teaser "Oh, espera… el equipo tiene algo muy especial que decir…" justo antes de la felicitación, ahora al principio de todo.
- Como el video de YouTube trae su propia música, mientras se muestra la felicitación se silencia la música de fondo y la canción personal de la persona (evita que suenen encimadas).

## Detalle técnico

- Subir el PNG del pastel (segunda imagen) como asset CDN con `lovable-assets` y usarlo en la slide; el cartel completo queda solo como referencia visual.
- `src/components/CelebrationExperience.tsx`
  - Reordenar `PHASES` a `["intro", "birthdays", "recognitions", "top", "suspense", "reveal", "closing"]`; la validación existente (`birthdays.length === 0`) ya salta la fase cuando no hay cumpleaños.
  - Ajustar `goNext`/`goPrev` e inicialización de `birthdayIndex` para el nuevo orden.
  - Silenciar/pausar `audioRef` y `birthdaySongRef` mientras `phase === "birthdays"`, restaurando volumen al salir.
  - Pasar `onFinish` a `BirthdaysPhase` para el botón "Terminar felicitación" (avanza persona o salta a `recognitions`).
- `src/components/celebration/BirthdaysPhase.tsx`
  - Montar `<Confetti count={160} />` en bucle durante la slide de persona, más serpentinas/estrellas animadas al estilo del cartel.
  - Reutilizar `EmojiBurst` con `triggerOnClick` para la explosión al hacer clic.
  - Insertar `<iframe>` de YouTube (embed con `autoplay=1`) con el ID elegido aleatoriamente entre `xJwktBHntTc` y `2o94pyMrB2g`, memoizado por persona.
  - Botón "Terminar felicitación" con estilo `btn-space`.
- Sin cambios de base de datos: se usa la columna `birthday` existente y `filterBirthdaysForWeek`, que ya calcula la ventana lunes-domingo de la semana.

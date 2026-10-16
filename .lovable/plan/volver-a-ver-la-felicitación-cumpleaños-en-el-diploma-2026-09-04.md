# Volver a ver la felicitación + cumpleaños en el diploma

## 1. Reabrir la felicitación desde el widget de cumpleaños

En la tarjeta de cumpleaños de la pantalla de inicio aparece un botón **"Volver a ver la felicitación"** cuando el cumpleaños cae dentro de la semana actual (lunes a domingo).

- Al pulsarlo se abre a pantalla completa la misma felicitación que se ve en la presentación: foto grande, "¡FELIZ CUMPLEAÑOS!", pastel flotando, muchísimo confeti, video de cumpleaños al azar y explosión de emojis al hacer clic.
- El botón para cerrarla dice **"Cerrar"** y regresa al inicio.
- Si el cumpleaños no es de esta semana (los próximos o los ya pasados), no aparece el botón.

## 2. Cumpleaños dentro del diploma

Cuando la persona cumple años en la semana del diploma, en su página de diploma se muestra:

- Una franja festiva arriba del certificado: "🎂 Además, esta semana fue tu cumpleaños" con globos y confeti.
- Un botón **"Ver mi felicitación"** que abre la misma felicitación a pantalla completa.
- Si no hay cumpleaños esa semana, el diploma se ve exactamente igual que ahora.

## Detalle técnico

- Nuevo `src/components/BirthdayGreetingOverlay.tsx`: overlay a pantalla completa (fondo `space-gradient` + `StarField`) que reutiliza `BirthdaysPhase` con una sola persona (`index={0}`) y `onFinish` = cerrar. Se le pasa el texto del botón como prop nueva opcional en `BirthdaysPhase` (`finishLabel`, por defecto "Terminar felicitación") para poder mostrar "Cerrar".
- `src/components/UpcomingBirthdays.tsx`: la consulta ya trae `people`; añadir `song_url` al `select`. Calcular la ventana lunes–domingo de la semana actual y, para el cumpleañero que cae dentro, renderizar el botón que abre el overlay.
- `supabase/functions/generate-summary/index.ts` (modo `diploma`): añadir `birthday, song_url` al `select` de `people` para que el diploma reciba esos datos.
- `src/pages/MiDiploma.tsx`: comparar mes/día de `person.birthday` contra el rango `week.start_date`–`week.end_date`; si coincide, mostrar la franja festiva y el botón que abre `BirthdayGreetingOverlay`.
- Sin cambios de base de datos ni de permisos.

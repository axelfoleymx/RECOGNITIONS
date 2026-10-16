import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Recognition {
  id: string;
  message: string;
  is_anonymous: boolean;
  people?: { name: string; photo_url?: string | null } | null;
  profiles?: { full_name: string } | null;
}

interface Week {
  start_date: string;
  end_date: string;
}

interface WinnerData {
  personId: string;
  name: string;
  photoUrl: string | null;
  voteCount: number;
  reasons: string[];
}

interface TopVotedEntry {
  personId: string;
  name: string;
  photoUrl: string | null;
  count: number;
  reasons: string[];
}

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const roundedRect = (pdf: jsPDF, x: number, y: number, w: number, h: number, r: number) => {
  pdf.roundedRect(x, y, w, h, r, r, "F");
};

const drawCircularImage = (pdf: jsPDF, img: HTMLImageElement, cx: number, cy: number, radius: number) => {
  const size = radius * 2;
  pdf.addImage(img, "PNG", cx - radius, cy - radius, size, size);
};

const drawInitialsCircle = (pdf: jsPDF, name: string, cx: number, cy: number, radius: number) => {
  pdf.setFillColor(0, 180, 220);
  pdf.circle(cx, cy, radius + 3, "F");
  pdf.setFillColor(26, 26, 78);
  pdf.circle(cx, cy, radius, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(radius * 0.8);
  pdf.setFont("helvetica", "bold");
  pdf.text(name.slice(0, 2).toUpperCase(), cx, cy + radius * 0.3, { align: "center" });
};

const drawStars = (pdf: jsPDF, size: number) => {
  const stars = [
    { x: 40, y: 60, s: 3 }, { x: 450, y: 45, s: 2 }, { x: 80, y: 420, s: 2.5 },
    { x: 430, y: 400, s: 3 }, { x: 250, y: 30, s: 2 }, { x: 60, y: 250, s: 1.5 },
    { x: 440, y: 200, s: 2 }, { x: 150, y: 460, s: 2 }, { x: 350, y: 470, s: 1.5 },
    { x: 100, y: 130, s: 1.5 }, { x: 400, y: 120, s: 2 },
  ];
  stars.forEach(({ x, y, s }) => {
    if (x < size && y < size) {
      pdf.setFillColor(255, 215, 0);
      pdf.circle(x, y, s, "F");
      pdf.setGState(pdf.GState({ opacity: 0.2 }));
      pdf.circle(x, y, s * 3, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));
    }
  });
};

const drawBackground = (pdf: jsPDF, size: number) => {
  pdf.setFillColor(8, 12, 30);
  pdf.rect(0, 0, size, size, "F");
  pdf.setGState(pdf.GState({ opacity: 0.15 }));
  pdf.setFillColor(26, 26, 100);
  pdf.circle(size / 2, size / 2, size * 0.4, "F");
  pdf.setGState(pdf.GState({ opacity: 0.08 }));
  pdf.setFillColor(0, 180, 220);
  pdf.circle(size / 2, size * 0.45, size * 0.25, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));
};

const drawWinnerBackground = (pdf: jsPDF, size: number) => {
  // Deeper, richer space background
  pdf.setFillColor(5, 5, 20);
  pdf.rect(0, 0, size, size, "F");

  // Golden nebula glow
  pdf.setGState(pdf.GState({ opacity: 0.12 }));
  pdf.setFillColor(255, 180, 0);
  pdf.circle(size / 2, size * 0.35, size * 0.35, "F");
  pdf.setGState(pdf.GState({ opacity: 0.08 }));
  pdf.setFillColor(255, 215, 0);
  pdf.circle(size * 0.3, size * 0.6, size * 0.2, "F");
  pdf.circle(size * 0.7, size * 0.6, size * 0.2, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Golden stars (bigger, more prominent)
  const goldenStars = [
    { x: 30, y: 40, s: 4 }, { x: 470, y: 35, s: 3.5 }, { x: 60, y: 460, s: 3 },
    { x: 440, y: 450, s: 4 }, { x: 250, y: 20, s: 3 }, { x: 20, y: 250, s: 2.5 },
    { x: 480, y: 250, s: 3 }, { x: 120, y: 480, s: 2.5 }, { x: 380, y: 480, s: 3 },
    { x: 80, y: 100, s: 2 }, { x: 420, y: 90, s: 2.5 }, { x: 50, y: 350, s: 2 },
    { x: 450, y: 350, s: 2 },
  ];
  goldenStars.forEach(({ x, y, s }) => {
    if (x < size && y < size) {
      pdf.setFillColor(255, 215, 0);
      pdf.circle(x, y, s, "F");
      pdf.setGState(pdf.GState({ opacity: 0.3 }));
      pdf.circle(x, y, s * 4, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));
    }
  });

  // Top and bottom golden accent bars
  pdf.setGState(pdf.GState({ opacity: 0.8 }));
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, 0, size, 5, "F");
  pdf.rect(0, size - 5, size, 5, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));
};

export const generatePdf = async (recognitions: any[], week: Week, winners?: WinnerData[], topVoted?: TopVotedEntry[]) => {
  const size = 500;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [size, size] });

  const weekLabel = `${format(parseISO(week.start_date), "d MMM", { locale: es })} – ${format(parseISO(week.end_date), "d MMM yyyy", { locale: es })}`;

  // ═══════════════════ COVER PAGE ═══════════════════
  drawBackground(pdf, size);
  drawStars(pdf, size);

  pdf.setDrawColor(255, 215, 0);
  pdf.setGState(pdf.GState({ opacity: 0.3 }));
  pdf.setLineWidth(1);
  pdf.line(size * 0.2, size * 0.38, size * 0.8, size * 0.38);
  pdf.line(size * 0.2, size * 0.68, size * 0.8, size * 0.68);
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setGState(pdf.GState({ opacity: 0.1 }));
  pdf.setFillColor(255, 215, 0);
  roundedRect(pdf, size * 0.3, size * 0.4, size * 0.4, size * 0.26, 12);
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setTextColor(255, 215, 0);
  pdf.setFontSize(30);
  pdf.setFont("helvetica", "bold");
  pdf.text("ROCKETING", size / 2, size * 0.48, { align: "center" });

  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text("RECOGNITIONS", size / 2, size * 0.55, { align: "center" });

  pdf.setFontSize(13);
  pdf.setTextColor(180, 190, 210);
  pdf.text("Reconocimientos de la Semana", size / 2, size * 0.63, { align: "center" });

  pdf.setFontSize(14);
  pdf.setTextColor(0, 212, 255);
  pdf.text(weekLabel, size / 2, size * 0.75, { align: "center" });

  pdf.setFontSize(11);
  pdf.setTextColor(150, 160, 180);
  pdf.text(`${recognitions.length} reconocimiento${recognitions.length !== 1 ? "s" : ""}`, size / 2, size * 0.82, { align: "center" });

  // ═══════════════════ RECOGNITION PAGES ═══════════════════
  for (const rec of recognitions) {
    pdf.addPage([size, size]);
    drawBackground(pdf, size);
    drawStars(pdf, size);

    const personName = rec.people?.name || "Unknown";
    const photoUrl = rec.people?.photo_url;

    pdf.setGState(pdf.GState({ opacity: 0.6 }));
    pdf.setFillColor(255, 215, 0);
    pdf.rect(0, 0, size, 4, "F");
    pdf.setGState(pdf.GState({ opacity: 1 }));

    const avatarY = 100;
    const avatarRadius = 45;

    if (photoUrl) {
      const img = await loadImage(photoUrl);
      if (img) {
        pdf.setFillColor(0, 180, 220);
        pdf.setGState(pdf.GState({ opacity: 0.4 }));
        pdf.circle(size / 2, avatarY, avatarRadius + 6, "F");
        pdf.setGState(pdf.GState({ opacity: 1 }));
        pdf.setDrawColor(0, 212, 255);
        pdf.setLineWidth(2.5);
        pdf.circle(size / 2, avatarY, avatarRadius + 3, "S");
        drawCircularImage(pdf, img, size / 2, avatarY, avatarRadius);
        pdf.setDrawColor(0, 212, 255);
        pdf.setLineWidth(2);
        pdf.circle(size / 2, avatarY, avatarRadius, "S");
      } else {
        drawInitialsCircle(pdf, personName, size / 2, avatarY, avatarRadius);
      }
    } else {
      drawInitialsCircle(pdf, personName, size / 2, avatarY, avatarRadius);
    }

    pdf.setTextColor(255, 215, 0);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text(personName, size / 2, avatarY + avatarRadius + 35, { align: "center" });

    const sepY = avatarY + avatarRadius + 50;
    pdf.setDrawColor(0, 212, 255);
    pdf.setGState(pdf.GState({ opacity: 0.4 }));
    pdf.setLineWidth(0.5);
    pdf.line(size * 0.3, sepY, size * 0.7, sepY);
    pdf.setGState(pdf.GState({ opacity: 1 }));

    const msgStartY = sepY + 20;
    const msgPadding = 40;
    pdf.setGState(pdf.GState({ opacity: 0.15 }));
    pdf.setFillColor(255, 255, 255);
    roundedRect(pdf, msgPadding, msgStartY, size - msgPadding * 2, size - msgStartY - 80, 10);
    pdf.setGState(pdf.GState({ opacity: 1 }));

    pdf.setTextColor(255, 215, 0);
    pdf.setGState(pdf.GState({ opacity: 0.3 }));
    pdf.setFontSize(60);
    pdf.text("\u201C", msgPadding + 15, msgStartY + 45);
    pdf.setGState(pdf.GState({ opacity: 1 }));

    pdf.setTextColor(220, 225, 235);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");

    const lines = pdf.splitTextToSize(rec.message, size - msgPadding * 2 - 30);
    const lineHeight = 20;
    const textStartY = msgStartY + 35;
    lines.forEach((line: string, i: number) => {
      if (textStartY + i * lineHeight < size - 90) {
        pdf.text(line, size / 2, textStartY + i * lineHeight, { align: "center" });
      }
    });

    const authorY = size - 45;
    if (!rec.is_anonymous && rec.profiles?.full_name) {
      pdf.setTextColor(0, 212, 255);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "italic");
      pdf.text(`— ${rec.profiles.full_name}`, size / 2, authorY, { align: "center" });
    } else if (rec.is_anonymous) {
      pdf.setTextColor(100, 105, 130);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "italic");
      pdf.text("— Anónimo", size / 2, authorY, { align: "center" });
    }
  }

  // ═══════════════════ TOP VOTED SLIDE ═══════════════════
  if (topVoted && topVoted.length > 1) {
    // Show all non-winner entries (those below the max count)
    const maxCount = topVoted[0]?.count ?? 0;
    const runners = topVoted.filter((v) => v.count < maxCount);

    if (runners.length > 0) {
      pdf.addPage([size, size]);
      drawBackground(pdf, size);
      drawStars(pdf, size);

      // Title
      pdf.setTextColor(255, 215, 0);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("LOS MÁS VOTADOS", size / 2, 55, { align: "center" });

      pdf.setFontSize(11);
      pdf.setTextColor(180, 190, 210);
      pdf.setFont("helvetica", "normal");
      pdf.text(weekLabel, size / 2, 75, { align: "center" });

      let currentY = 100;
      const padding = 40;
      const maxWidth = size - padding * 2;
      const maxY = size - 30;

      for (let i = runners.length - 1; i >= 0; i--) {
        const entry = runners[i];
        const place = topVoted.length - (runners.length - 1 - i);
        if (currentY > maxY - 40) break;

        // Place + name + count row
        pdf.setGState(pdf.GState({ opacity: 0.1 }));
        pdf.setFillColor(255, 255, 255);
        const rowHeight = 30;
        roundedRect(pdf, padding, currentY, maxWidth, rowHeight, 6);
        pdf.setGState(pdf.GState({ opacity: 1 }));

        pdf.setTextColor(180, 190, 210);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${place}°`, padding + 15, currentY + 20);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(entry.name, padding + 45, currentY + 20);

        // Vote bar
        const barX = padding + 45;
        const barMaxW = maxWidth - 80;
        const barW = maxCount > 0 ? (entry.count / maxCount) * barMaxW : 0;
        pdf.setGState(pdf.GState({ opacity: 0.3 }));
        pdf.setFillColor(0, 180, 220);
        roundedRect(pdf, barX, currentY + 23, barW, 4, 2);
        pdf.setGState(pdf.GState({ opacity: 1 }));

        pdf.setTextColor(0, 212, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${entry.count}`, padding + maxWidth - 25, currentY + 20, { align: "center" });

        currentY += rowHeight + 4;

        // Reasons
        const filteredReasons = entry.reasons.filter((r) => r.trim().length > 0);
        if (filteredReasons.length > 0) {
          for (const reason of filteredReasons) {
            if (currentY > maxY - 20) break;
            pdf.setTextColor(200, 205, 220);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "italic");
            const reasonLines = pdf.splitTextToSize(`\u201C${reason}\u201D`, maxWidth - 60);
            reasonLines.forEach((line: string, li: number) => {
              if (currentY + li * 12 < maxY) {
                pdf.text(line, padding + 50, currentY + li * 12);
              }
            });
            currentY += reasonLines.length * 12 + 4;
          }
          currentY += 6;
        }
      }

      // Mystery 1st place teaser
      if (currentY < maxY - 30) {
        pdf.setGState(pdf.GState({ opacity: 0.15 }));
        pdf.setFillColor(255, 215, 0);
        roundedRect(pdf, padding, currentY, maxWidth, 30, 6);
        pdf.setGState(pdf.GState({ opacity: 1 }));

        pdf.setTextColor(255, 215, 0);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("1°", padding + 15, currentY + 20);
        pdf.setFontSize(14);
        pdf.text("¿Quién será?", padding + 45, currentY + 20);
      }
    }
  }

  // ═══════════════════ WINNER SLIDE ═══════════════════
  if (winners && winners.length > 0 && winners[0].voteCount > 0) {
    pdf.addPage([size, size]);
    drawWinnerBackground(pdf, size);

    const isTie = winners.length > 1;

    // Golden decorative lines
    pdf.setDrawColor(255, 215, 0);
    pdf.setGState(pdf.GState({ opacity: 0.5 }));
    pdf.setLineWidth(2);
    pdf.line(size * 0.1, 30, size * 0.9, 30);
    pdf.line(size * 0.1, size - 30, size * 0.9, size - 30);
    pdf.setGState(pdf.GState({ opacity: 1 }));

    // Stars
    pdf.setTextColor(255, 215, 0);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("\u2605 \u2605 \u2605", size / 2, 55, { align: "center" });

    // Title
    pdf.setFontSize(isTie ? 24 : 28);
    pdf.text(
      isTie ? "ROCKETER DE LA SEMANA (EMPATE)" : "ROCKETER DE LA SEMANA",
      size / 2, 85, { align: "center" }
    );

    // Week label
    pdf.setFontSize(11);
    pdf.setTextColor(200, 200, 220);
    pdf.setFont("helvetica", "normal");
    pdf.text(weekLabel, size / 2, 105, { align: "center" });

    // Winner photos - distributed horizontally
    const winnerRadius = isTie
      ? winners.length <= 2 ? 40 : 30
      : 55;
    const winnerAvatarY = isTie ? 160 : 170;
    const totalWidth = winners.length * (winnerRadius * 2 + 20) - 20;
    const startX = (size - totalWidth) / 2 + winnerRadius;

    for (let wi = 0; wi < winners.length; wi++) {
      const winner = winners[wi];
      const cx = isTie ? startX + wi * (winnerRadius * 2 + 20) : size / 2;

      // Golden ring glow
      pdf.setFillColor(255, 215, 0);
      pdf.setGState(pdf.GState({ opacity: 0.15 }));
      pdf.circle(cx, winnerAvatarY, winnerRadius + 15, "F");
      pdf.setGState(pdf.GState({ opacity: 0.3 }));
      pdf.circle(cx, winnerAvatarY, winnerRadius + 8, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));

      // Golden border ring
      pdf.setDrawColor(255, 215, 0);
      pdf.setLineWidth(3);
      pdf.circle(cx, winnerAvatarY, winnerRadius + 4, "S");

      if (winner.photoUrl) {
        const img = await loadImage(winner.photoUrl);
        if (img) {
          drawCircularImage(pdf, img, cx, winnerAvatarY, winnerRadius);
          pdf.setDrawColor(255, 215, 0);
          pdf.setLineWidth(2);
          pdf.circle(cx, winnerAvatarY, winnerRadius, "S");
        } else {
          drawInitialsCircle(pdf, winner.name, cx, winnerAvatarY, winnerRadius);
        }
      } else {
        drawInitialsCircle(pdf, winner.name, cx, winnerAvatarY, winnerRadius);
      }

      // Name below photo
      pdf.setTextColor(255, 215, 0);
      pdf.setFontSize(isTie ? 16 : 26);
      pdf.setFont("helvetica", "bold");
      pdf.text(winner.name, cx, winnerAvatarY + winnerRadius + 22, { align: "center" });
    }

    // Vote count (shared)
    const namesEndY = winnerAvatarY + winnerRadius + (isTie ? 38 : 50);
    pdf.setFontSize(14);
    pdf.setTextColor(0, 212, 255);
    const voteCount = winners[0].voteCount;
    pdf.text(
      `${voteCount} voto${voteCount !== 1 ? "s" : ""}${isTie ? " c/u" : ""}`,
      size / 2, namesEndY, { align: "center" }
    );

    // Reasons section - grouped by winner when tie
    const reasonsStartY = namesEndY + 20;
    const hasReasons = winners.some((w) => w.reasons.some((r) => r.trim().length > 0));

    if (hasReasons) {
      pdf.setDrawColor(255, 215, 0);
      pdf.setGState(pdf.GState({ opacity: 0.4 }));
      pdf.setLineWidth(1);
      pdf.line(size * 0.2, reasonsStartY - 10, size * 0.8, reasonsStartY - 10);
      pdf.setGState(pdf.GState({ opacity: 1 }));

      pdf.setFontSize(11);
      pdf.setTextColor(255, 215, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text("Lo que dicen sus compañeros:", size / 2, reasonsStartY + 5, { align: "center" });

      const padding = 45;
      const maxWidth = size - padding * 2;
      let currentY = reasonsStartY + 25;
      const maxY = size - 45;

      if (isTie) {
        for (const winner of winners) {
          const filtered = winner.reasons.filter((r) => r.trim().length > 0);
          if (filtered.length === 0) continue;
          if (currentY > maxY - 30) break;

          // Winner name header
          pdf.setTextColor(255, 215, 0);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Para ${winner.name}:`, size / 2, currentY, { align: "center" });
          currentY += 14;

          for (const reason of filtered) {
            if (currentY > maxY - 30) break;
            pdf.setGState(pdf.GState({ opacity: 0.08 }));
            pdf.setFillColor(255, 215, 0);
            const reasonLines = pdf.splitTextToSize(`\u201C${reason}\u201D`, maxWidth - 20);
            const blockHeight = reasonLines.length * 14 + 8;
            if (currentY + blockHeight > maxY) break;
            roundedRect(pdf, padding, currentY - 4, maxWidth, blockHeight, 5);
            pdf.setGState(pdf.GState({ opacity: 1 }));
            pdf.setTextColor(220, 225, 235);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "italic");
            reasonLines.forEach((line: string, li: number) => {
              pdf.text(line, size / 2, currentY + 10 + li * 14, { align: "center" });
            });
            currentY += blockHeight + 6;
          }
          currentY += 8;
        }
      } else {
        const reasons = winners[0].reasons.filter((r) => r.trim().length > 0);
        for (const reason of reasons) {
          if (currentY > maxY - 30) break;
          pdf.setGState(pdf.GState({ opacity: 0.08 }));
          pdf.setFillColor(255, 215, 0);
          const reasonLines = pdf.splitTextToSize(`\u201C${reason}\u201D`, maxWidth - 20);
          const blockHeight = reasonLines.length * 14 + 8;
          if (currentY + blockHeight > maxY) break;
          roundedRect(pdf, padding, currentY - 4, maxWidth, blockHeight, 5);
          pdf.setGState(pdf.GState({ opacity: 1 }));
          pdf.setTextColor(220, 225, 235);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          reasonLines.forEach((line: string, li: number) => {
            pdf.text(line, size / 2, currentY + 10 + li * 14, { align: "center" });
          });
          currentY += blockHeight + 6;
        }
      }
    }
  }

  pdf.save(`recognitions-${week.start_date}.pdf`);
};

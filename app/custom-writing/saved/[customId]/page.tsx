"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { useRef, useEffect, useState, useCallback } from "react";
import * as Vex from "vexflow";

const { Renderer, Stave, StaveNote, Voice, Formatter, Beam } = Vex;

// Set music font (array format for compatibility)
declare global {
  interface Window {
    Vex?: {
      Flow?: {
        setMusicFont: (fonts: string[]) => void;
      };
    };
  }
}

// Force reliable music font
if (typeof window !== "undefined" && window.Vex?.Flow) {
  window.Vex.Flow.setMusicFont(["Bravura", "Gonville"]);
}

type PlacedNote = {
  id: string;
  pitch: string;
  duration: string;
  isRest: boolean;
  barIndex: number;
  voice: "treble" | "bass";
};

export default function SavedPieceView() {
  const params = useParams();
  const customId = params.customId as string;
  const router = useRouter();

  // Skip query if we already have the ID (prevents stuck loading)
  const drafts = useQuery(
    api.customDrafts.getMyCustomDrafts,
    customId ? undefined : "skip",
  );

  const piece = drafts?.find((d) => d._id === customId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exporting, setExporting] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // force re-render

  // Render function
  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !piece) {
      console.log("Cannot render: missing canvas or piece", { piece });
      return;
    }

    console.log("Starting render for:", piece.title, piece.barCount, "bars");

    const { barCount, notes, timeSig: tsLabel, keySig, template } = piece;
    const isGrand = template === "grand-staff";
    const BARS_PER_ROW = 4;
    const STAVE_WIDTH = 220;
    const STAVE_X_START = 20;

    const totalRows = Math.ceil(barCount / BARS_PER_ROW);
    const rowHeight = isGrand ? 230 : 130;
    const rowGap = 50;
    const canvasW = STAVE_WIDTH * BARS_PER_ROW + STAVE_X_START + 40;
    const canvasH = totalRows * (rowHeight + rowGap) + 60;

    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    // ✅ Fill background BEFORE VexFlow renderer
    const raw2d = canvas.getContext("2d")!;
    raw2d.fillStyle = "#ffffff";
    raw2d.fillRect(0, 0, canvasW, canvasH);

    // ✅ Then create renderer
    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();

    // White background (helps visibility)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const { numBeats, beatValue } = (() => {
      const [num, den] = tsLabel.split("/").map(Number);
      return { numBeats: num || 4, beatValue: den || 4 };
    })();

    const notesByBar: Record<number, PlacedNote[]> = {};
    for (let i = 0; i < barCount; i++) notesByBar[i] = [];
    notes.forEach((n) => {
      if (notesByBar[n.barIndex]) notesByBar[n.barIndex].push(n);
    });

    for (let barIdx = 0; barIdx < barCount; barIdx++) {
      const row = Math.floor(barIdx / BARS_PER_ROW);
      const col = barIdx % BARS_PER_ROW;
      const x = STAVE_X_START + col * STAVE_WIDTH;
      const y = row * (rowHeight + rowGap) + 30;

      const treble = new Stave(x, y, STAVE_WIDTH);
      if (col === 0) {
        treble
          .addClef("treble")
          .addTimeSignature(tsLabel)
          .addKeySignature(keySig);
      }
      treble.setContext(ctx).draw();

      let bass: InstanceType<typeof Stave> | null = null;
      if (isGrand) {
        bass = new Stave(x, y + 110, STAVE_WIDTH);
        if (col === 0) {
          bass
            .addClef("bass")
            .addTimeSignature(tsLabel)
            .addKeySignature(keySig);
        }
        bass.setContext(ctx).draw();
      }

      // Helper to render one voice safely
      const renderVoice = (
        voiceNotes: PlacedNote[],
        clef: "treble" | "bass",
        stave: InstanceType<typeof Stave>,
      ) => {
        if (voiceNotes.length === 0) return;

        const vfNotes = voiceNotes.map((n) => {
          const keys = [
            n.isRest ? (clef === "treble" ? "b/4" : "d/3") : n.pitch,
          ];
          const duration = n.isRest ? `${n.duration}r` : n.duration;
          return new StaveNote({ clef, keys, duration });
        });

        try {
          const voice = new Voice({ numBeats, beatValue }).setStrict(false);
          voice.addTickables(vfNotes);
          new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 70);
          voice.draw(ctx, stave);

          Beam.generateBeams(vfNotes.filter((n) => !n.isRest)).forEach((b) =>
            b.setContext(ctx).draw(),
          );
          console.log(
            `Rendered ${clef} voice for bar ${barIdx}: ${vfNotes.length} notes`,
          );
        } catch (err) {
          console.error(`Voice render failed in bar ${barIdx} (${clef}):`, err);
        }
      };

      renderVoice(
        notesByBar[barIdx]?.filter((n) => n.voice === "treble") ?? [],
        "treble",
        treble,
      );

      if (isGrand && bass) {
        renderVoice(
          notesByBar[barIdx]?.filter((n) => n.voice === "bass") ?? [],
          "bass",
          bass,
        );
      }
    }

    console.log("Render complete for", piece.title);
  }, [piece]);

  useEffect(() => {
    if (piece && canvasRef.current) {
      renderToCanvas();
      // Force one extra render after mount (helps with timing issues)
      setTimeout(() => setRenderKey((k) => k + 1), 100);
    }
  }, [piece, renderToCanvas]);

  const exportFullPDF = async () => {
    if (!piece || !canvasRef.current) return;
    setExporting(true);

    try {
      renderToCanvas();
      await new Promise((r) => requestAnimationFrame(r)); // wait for paint

      const canvas = canvasRef.current;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: "a4",
      });

      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      const iw = canvas.width * ratio;
      const ih = canvas.height * ratio;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pw - iw) / 2,
        (ph - ih) / 2,
        iw,
        ih,
      );
      pdf.save(`${piece.title.replace(/\s+/g, "-")}-full.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  // Better loading states
  if (drafts === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-950 text-stone-300">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p>Loading your saved pieces...</p>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-950 text-stone-300">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p>Piece not found or still loading... (ID: {customId})</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{piece.title}</h1>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/custom-writing?load=${customId}`)}
            >
              Edit this piece
            </Button>
            <Button
              onClick={exportFullPDF}
              disabled={exporting}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 text-sm text-stone-400 bg-stone-900/60 p-4 rounded-lg border border-stone-800">
          <div>
            <span className="font-semibold text-stone-300">Key:</span>{" "}
            {piece.keySig}
          </div>
          <div>
            <span className="font-semibold text-stone-300">Time:</span>{" "}
            {piece.timeSig}
          </div>
          <div>
            <span className="font-semibold text-stone-300">Tempo:</span>{" "}
            {piece.tempo} BPM
          </div>
          <div>
            <span className="font-semibold text-stone-300">Bars:</span>{" "}
            {piece.barCount}
          </div>
          <div>
            <span className="font-semibold text-stone-300">Last saved:</span>{" "}
            {new Date(piece.updatedAt).toLocaleDateString()}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-stone-800 p-8 overflow-x-auto">
          <canvas ref={canvasRef} className="min-w-[900px] mx-auto block" />
        </div>
      </div>
    </div>
  );
}

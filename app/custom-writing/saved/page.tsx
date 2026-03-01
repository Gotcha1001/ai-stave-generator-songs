// app/custom-writing/saved/page.tsx
// Displays all saved custom-notation pieces for the current user.
// Add a "My Custom Pieces" link in AppSidebar pointing to /custom-writing/saved

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
  Music,
  Trash2,
  Clock,
  PenLine,
  Search,
  ChevronRight,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

type PlacedNote = {
  id: string;
  pitch: string;
  duration: string;
  isRest: boolean;
  barIndex: number;
  voice: "treble" | "bass";
};

type DraftDoc = {
  _id: Id<"customDrafts">;
  _creationTime: number;
  title: string;
  timeSig: string;
  keySig: string;
  template: string;
  barCount: number;
  tempo: number;
  notes: PlacedNote[];
  createdAt: number;
  updatedAt: number;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function noteCount(d: DraftDoc) {
  return d.notes.filter((n) => !n.isRest).length;
}

// ── PDF export: renders a summary sheet for a single piece ────────────────
function exportPiecePDF(draft: DraftDoc) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  // ── Background ──
  pdf.setFillColor(15, 15, 15);
  pdf.rect(0, 0, pw, ph, "F");

  // ── Amber accent bar ──
  pdf.setFillColor(245, 158, 11);
  pdf.rect(0, 0, pw, 4, "F");

  // ── Title ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(240, 240, 240);
  pdf.text(draft.title, 40, 50);

  // ── Subtitle ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(130, 130, 130);
  pdf.text("Custom Notation · Hand-written piece", 40, 66);

  // ── Divider ──
  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.5);
  pdf.line(40, 78, pw - 40, 78);

  // ── Metadata grid ──
  const meta: [string, string][] = [
    ["Time Signature", draft.timeSig],
    ["Key Signature", draft.keySig],
    ["Tempo", `${draft.tempo} BPM`],
    [
      "Template",
      draft.template === "grand-staff" ? "Grand Staff" : "Lead Sheet",
    ],
    ["Bars", String(draft.barCount)],
    ["Notes", String(noteCount(draft))],
    ["Rests", String(draft.notes.filter((n) => n.isRest).length)],
    ["Last Updated", formatDate(draft.updatedAt)],
  ];

  const colW = (pw - 80) / 4;
  const rowH = 54;
  const gridTop = 100;

  meta.forEach(([label, value], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 40 + col * colW;
    const y = gridTop + row * rowH;

    // Card bg
    pdf.setFillColor(28, 28, 28);
    pdf.roundedRect(x, y, colW - 10, rowH - 8, 4, 4, "F");

    // Label
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(label.toUpperCase(), x + 10, y + 16);

    // Value
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(245, 158, 11);
    pdf.text(value, x + 10, y + 36);
  });

  // ── Note breakdown section ──
  const sectionY = gridTop + Math.ceil(meta.length / 4) * rowH + 16;

  pdf.setDrawColor(50, 50, 50);
  pdf.line(40, sectionY, pw - 40, sectionY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.text("NOTE BREAKDOWN BY BAR", 40, sectionY + 16);

  // Bar usage bars
  const barAreaTop = sectionY + 26;
  const barAreaW = pw - 80;
  const barH = 14;
  const barSpacing = 22;
  const barsPerRow = Math.min(draft.barCount, 16);
  const barBlockW = barAreaW / barsPerRow;

  // Group notes by bar
  const notesByBar: Record<number, number> = {};
  for (let i = 0; i < draft.barCount; i++) notesByBar[i] = 0;
  for (const n of draft.notes) {
    if (!n.isRest && notesByBar[n.barIndex] !== undefined) {
      notesByBar[n.barIndex]++;
    }
  }
  const maxNotes = Math.max(...Object.values(notesByBar), 1);

  for (let i = 0; i < Math.min(draft.barCount, 16); i++) {
    const x = 40 + i * barBlockW;
    const fillPct = notesByBar[i] / maxNotes;

    // Track bg
    pdf.setFillColor(35, 35, 35);
    pdf.roundedRect(x + 2, barAreaTop, barBlockW - 6, barH, 2, 2, "F");

    // Fill
    if (fillPct > 0) {
      pdf.setFillColor(245, 158, 11);
      pdf.roundedRect(
        x + 2,
        barAreaTop,
        (barBlockW - 6) * fillPct,
        barH,
        2,
        2,
        "F",
      );
    }

    // Label
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`${i + 1}`, x + barBlockW / 2, barAreaTop + barH + 9, {
      align: "center",
    });
  }

  if (draft.barCount > 16) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(
      `+ ${draft.barCount - 16} more bars`,
      40,
      barAreaTop + barH + barSpacing,
    );
  }

  // ── Footer ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  pdf.text(
    `Exported ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    40,
    ph - 20,
  );
  pdf.text(
    "Custom Notation — Full score available in the editor",
    pw - 40,
    ph - 20,
    {
      align: "right",
    },
  );

  pdf.save(`${draft.title.replace(/\s+/g, "-")}.pdf`);
}

export default function SavedCustomPiecesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const drafts = (useQuery(api.customDrafts.getMyCustomDrafts) ??
    []) as DraftDoc[];
  const deleteDraft = useMutation(api.customDrafts.deleteCustomDraft);

  const filtered = drafts.filter((d) => {
    const q = search.toLowerCase();
    return (
      !search ||
      d.title.toLowerCase().includes(q) ||
      d.keySig.toLowerCase().includes(q) ||
      d.timeSig.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (e: React.MouseEvent, id: Id<"customDrafts">) => {
    e.stopPropagation();
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    await deleteDraft({ id });
  };

  const handleExportPDF = useCallback(
    async (e: React.MouseEvent, draft: DraftDoc) => {
      e.stopPropagation();
      setExportingId(draft._id);
      // Slight delay so UI updates before blocking PDF work
      await new Promise((r) => setTimeout(r, 50));
      exportPiecePDF(draft);
      setExportingId(null);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <PenLine className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="font-serif text-2xl text-stone-100">
            My Custom Pieces
          </h1>
        </div>
        <p className="text-sm text-stone-500 ml-11">
          Your hand-written notation pieces
        </p>
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, key, time sig..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        {drafts.length > 0 && (
          <span className="ml-auto text-xs text-stone-600 font-mono">
            {filtered.length} / {drafts.length} pieces
          </span>
        )}
        <button
          onClick={() => router.push("/custom-writing")}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-semibold transition-colors"
        >
          <PenLine className="w-3.5 h-3.5" />
          New Piece
        </button>
      </div>

      {/* Empty state */}
      {drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 mb-4">
            <Music className="w-7 h-7 text-stone-600" />
          </div>
          <p className="text-stone-400 font-medium mb-1">No pieces yet</p>
          <p className="text-stone-600 text-sm mb-6">
            Head to Custom Writing and save your first piece
          </p>
          <button
            onClick={() => router.push("/custom-writing")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-semibold transition-colors"
          >
            Start Writing
          </button>
        </div>
      )}

      {/* No results */}
      {drafts.length > 0 && filtered.length === 0 && (
        <p className="text-stone-500 text-sm py-12 text-center">
          No pieces match &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Pieces grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filtered.map((draft) => (
            <motion.div
              key={draft._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              onClick={() => router.push(`/custom-writing?load=${draft._id}`)}
              className="group relative bg-stone-900 border border-stone-800 rounded-xl p-5 cursor-pointer hover:border-amber-500/40 hover:bg-stone-800/60 transition-all"
            >
              {/* Action buttons — top right, revealed on hover */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* PDF download */}
                <button
                  onClick={(e) => handleExportPDF(e, draft)}
                  disabled={exportingId === draft._id}
                  title="Download PDF summary"
                  className="p-1.5 rounded-md hover:bg-amber-500/20 text-stone-500 hover:text-amber-400 transition-colors disabled:opacity-40"
                >
                  {exportingId === draft._id ? (
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(e, draft._id)}
                  title="Delete piece"
                  className="p-1.5 rounded-md hover:bg-red-500/20 text-stone-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 mb-4">
                <PenLine className="w-5 h-5 text-amber-400" />
              </div>

              {/* Title */}
              <h3 className="font-semibold text-stone-100 text-base mb-1 pr-16 truncate">
                {draft.title}
              </h3>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
                  {draft.keySig}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
                  {draft.timeSig}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
                  {draft.tempo} BPM
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
                  {draft.barCount} bars
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
                  {noteCount(draft)} notes
                </span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
                <Clock className="w-3 h-3" />
                <span>Updated {formatDate(draft.updatedAt)}</span>
              </div>

              {/* Arrow */}
              <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-stone-700 group-hover:text-amber-500 transition-colors" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

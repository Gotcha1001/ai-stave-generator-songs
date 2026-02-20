"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import Staff from "../components/Staff";
import { api } from "@/convex/_generated/api";
import { generateSimpleSong } from "@/lib/musicGenerator";
import { NoteType } from "@/types/music";

export default function StudioPage() {
  const createSong = useMutation(api.songs.createSong);

  const [rightNotes, setRightNotes] = useState<NoteType[]>([]);
  const [leftNotes, setLeftNotes] = useState<NoteType[]>([]);
  const [bars, setBars] = useState(16);

  const handleGenerate = async () => {
    const { right, left, bars: b } = generateSimpleSong({ bars: 16 });

    setRightNotes(right);
    setLeftNotes(left);
    setBars(b);

    // Strip isRest — schema only expects { pitch, duration }
    const toSchema = (notes: NoteType[]) =>
      notes.map(({ pitch, duration }) => ({ pitch, duration }));

    await createSong({
      prompt: "Simple melody",
      key: "C",
      tempo: 120,
      rightHand: toSchema(right),
      leftHand: toSchema(left),
    });
  };

  return (
    <div className="min-h-screen p-10 space-y-6">
      <h1 className="text-3xl font-bold">🎼 AI Studio</h1>

      <button
        onClick={handleGenerate}
        className="bg-primary text-white px-6 py-2 rounded-lg"
      >
        Generate Piano Piece
      </button>

      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <Staff right={rightNotes} left={leftNotes} bars={bars} />
      </div>
    </div>
  );
}

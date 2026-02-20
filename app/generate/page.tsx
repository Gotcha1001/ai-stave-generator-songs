// app/page.tsx (or pages/index.tsx if using pages router)
// ─────────────────────────────────────────────────────────────
// Drop this in your Next.js app root. The component handles
// everything client-side (calls Anthropic API directly).

import MusicComposer from "../components/MusicComposer";

export default function Page() {
  return <MusicComposer />;
}

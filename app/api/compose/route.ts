// app/api/compose/route.ts
// ─────────────────────────────────────────────────────────────
// OPTIONAL: Use this if you want to keep your Anthropic API key
// server-side (recommended for production).
//
// Then in generateMusic.ts, change the fetch URL from:
//   'https://api.anthropic.com/v1/messages'
// to:
//   '/api/compose'
// and remove the x-api-key header from client code.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}

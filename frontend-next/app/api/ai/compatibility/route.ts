import { NextRequest, NextResponse } from 'next/server';

type Person = { name?: string; mbti?: string; career?: string; values?: string };
const person = (body: Record<string, unknown>, prefix: 'p1' | 'p2'): Person => ({
  name: String(body[`${prefix}_name`] ?? '').slice(0, 80), mbti: String(body[`${prefix}_mbti`] ?? '').slice(0, 20),
  career: String(body[`${prefix}_career`] ?? '').slice(0, 120), values: String(body[`${prefix}_values`] ?? '').slice(0, 120),
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Add GEMINI_KEY to .env.local and restart Next.js.' }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const first = person(body, 'p1'); const second = person(body, 'p2');
  if (!first.name || !second.name) return NextResponse.json({ error: 'Both names are required.' }, { status: 400 });
  const prompt = `Compare two adults for matrimonial compatibility using only supplied preferences. Do not infer protected traits. Return JSON only: {"total_score":number,"max_total":100,"conclusion":string,"dimensions":[{"name":string,"description":string,"score":number,"max_score":25,"insight":string}]}. Provide exactly: Personality style, Career rhythm, Shared values, Conversation starters. Integer scores 0-25; balanced practical language. Person 1: ${JSON.stringify(first)} Person 2: ${JSON.stringify(second)}`;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 900 } }), cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: 'Gemini comparison is unavailable. Check its API access.' }, { status: 502 });
    const data = await response.json(); const result = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!Array.isArray(result.dimensions) || typeof result.total_score !== 'number') throw new Error('Invalid response');
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: 'The AI comparison could not be completed. Please try again.' }, { status: 502 }); }
}

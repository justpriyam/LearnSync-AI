import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text } = await req.json();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    // Fallback: return empty to signal client should use Web Speech API
    return NextResponse.json({ fallback: true });
  }
  
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    }),
  });
  
  if (!response.ok) {
    return NextResponse.json({ fallback: true });
  }
  
  const audioBuffer = await response.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}

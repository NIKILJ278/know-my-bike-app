// Supabase Edge Function: ask-ai
// Deploy with:  supabase functions deploy ask-ai
// Set secret :  supabase secrets set GEMINI_API_KEY=your-google-ai-studio-key
//
// This function keeps your AI provider key server-side (never shipped to the
// browser) and answers bike-related questions, using the rider's active bike
// as context for more relevant answers. Uses Google Gemini (free tier
// available via https://aistudio.google.com/apikey).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.5-flash'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { question, bike } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY secret is not set on the Edge Function.')

    const system = `You are a helpful, concise motorcycle/scooter maintenance and riding assistant inside the Know My Bike app.
Answer in short paragraphs or bullet lists. Keep answers practical and India-relevant (fuel in litres, distances in km, currency in ₹) unless told otherwise.
${bike ? `The rider's active bike: ${bike.name} (${bike.make || 'unknown model'}), odometer ${bike.odometer_km || 0} km.` : ''}`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 700 },
        }),
      }
    )

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`AI provider error: ${text}`)
    }

    const data = await resp.json()
    const answer =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') ||
      'No answer returned.'

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
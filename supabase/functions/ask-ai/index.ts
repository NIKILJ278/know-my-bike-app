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

    const system = `You are a helpful, accurate motorcycle/scooter maintenance and riding assistant inside the Know My Bike app.
Answer in short paragraphs or bullet lists. Keep answers practical and India-relevant (fuel in litres, distances in km, currency in ₹) unless told otherwise.
Rules for reliability:
- You have access to a live web search tool — use it whenever the question involves a specific model's numbers (service intervals, tyre pressure, oil capacity, torque specs, mileage figures, prices) or anything that could have changed recently. Don't answer model-specific numbers purely from memory when search is available.
- Give a complete answer to the actual question asked — never stop halfway through a list or sentence.
- Be concrete: use real numbers, intervals, or steps (e.g. "every 3,000–5,000 km" not "regularly") wherever the topic has a commonly known figure.
- If, after searching, you're still not confident about a specific number or fact, say so plainly ("this varies by model, check your owner's manual") instead of guessing or inventing a figure.
- Keep the whole answer under ~220 words so it always finishes within budget — a short complete answer is better than a long unfinished one.
${bike ? `The rider's active bike: ${bike.name} (${bike.make || 'unknown model'}), odometer ${bike.odometer_km || 0} km.` : ''}`

    const callGemini = () =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: question }] }],
            // Grounds answers in real, current web results instead of
            // relying purely on the model's memorized (and sometimes
            // stale or half-invented) knowledge — this is the main fix
            // for "generates half info / not reliable": a model-specific
            // spec or figure now comes from an actual search result, not
            // a guess, and Gemini cites what it used internally to decide
            // how confident to sound.
            tools: [{ google_search: {} }],
            generationConfig: {
              // gemini-2.5-flash spends part of maxOutputTokens on invisible
              // "thinking" tokens before it writes the answer. A search
              // round-trip also consumes tokens, so the budget needs more
              // headroom than a memory-only answer did.
              thinkingConfig: { thinkingBudget: 512 },
              // Raised again — search grounding + a 220-word cap need more
              // room than a plain memory answer to avoid getting cut off
              // mid-list.
              maxOutputTokens: 3072,
              // Lower temperature trades a little creativity for answers
              // that stick closer to well-established facts — fewer
              // half-invented specifics, more consistent responses to the
              // same question asked twice.
              temperature: 0.35,
            },
          }),
        }
      )

    let resp = await callGemini()

    // Transient provider errors (rate limit / server hiccup) are common
    // enough with a free-tier key that a single retry meaningfully
    // improves reliability instead of surfacing an error to the rider.
    if (!resp.ok && (resp.status === 429 || resp.status >= 500)) {
      await new Promise((r) => setTimeout(r, 600))
      resp = await callGemini()
    }

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`AI provider error: ${text}`)
    }

    const data = await resp.json()
    const candidate = data?.candidates?.[0]
    let answer = candidate?.content?.parts?.map((p) => p.text || '').join('\n').trim()

    if (!answer) {
      throw new Error('The AI service returned an empty response. Please try asking again.')
    }

    // If the model got cut off mid-answer (hit the token limit before
    // finishing), trim to the last complete sentence so the rider never
    // sees a sentence or bullet point that stops dead mid-word.
    let truncated = candidate?.finishReason === 'MAX_TOKENS'
    if (truncated) {
      const lastBreak = Math.max(answer.lastIndexOf('. '), answer.lastIndexOf('\n'))
      if (lastBreak > answer.length * 0.4) answer = answer.slice(0, lastBreak + 1).trim()
    }

    return new Response(JSON.stringify({ answer, truncated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
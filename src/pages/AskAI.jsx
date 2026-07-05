import { useEffect, useRef, useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { supabase } from '../lib/supabaseClient'

const PROMPTS = ['Suggest a service schedule', 'How to improve my mileage?', "What's due soon on my bike?"]

export default function AskAI() {
  const { activeBike } = useBikes()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: question }])
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          question,
          bike: activeBike ? { name: activeBike.name, make: activeBike.make, odometer_km: activeBike.odometer_km } : null,
        },
      })
      if (error) throw error
      setMessages((m) => [...m, { role: 'assistant', content: data?.answer || "Sorry, I couldn't find an answer." }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `I ran into a problem reaching the AI service. ${err.message || ''}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-6 pt-14 flex flex-col h-screen">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Ask AI</h1>
          <p className="text-ink/50 dark:text-white/50">Anything about your bike — maintenance, mileage, mods.</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center text-lg shrink-0">🤖</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-6 px-6">
        {messages.length === 0 && (
          <p className="text-ink/40 dark:text-white/40 text-sm mt-8">Try one of the prompts below, or ask your own question.</p>
        )}
        <div className="flex flex-col gap-4 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'max-w-[92%] border-l-2 border-amber pl-4'}>
              {m.role === 'user' ? (
                <div className="bg-ink text-white dark:bg-white dark:text-ink rounded-2xl px-4 py-3 whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</div>
              )}
            </div>
          ))}
          {busy && <div className="border-l-2 border-amber pl-4 text-ink/40 dark:text-white/40 text-sm">Thinking…</div>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 py-2">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => send(p)} className="chip border-black/10 dark:border-white/15">{p}</button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="flex items-center gap-2 py-3 sticky bottom-0 bg-bg-light dark:bg-bg-dark"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
      >
        <input className="input flex-1" placeholder="Ask about your bike…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={busy} className="tap w-12 h-12 rounded-full bg-amber flex items-center justify-center shrink-0 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
    </div>
  )
}

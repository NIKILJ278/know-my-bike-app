import { useEffect, useRef, useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { supabase } from '../lib/supabaseClient'
import { BotIcon, WarningIcon, WrenchIcon, LeafIcon, FlagIcon, SearchIcon } from '../components/icons/Icon.jsx'

const PROMPTS = [
  { icon: WrenchIcon, text: 'Suggest a service schedule' },
  { icon: LeafIcon, text: 'How to improve my mileage?' },
  { icon: FlagIcon, text: "What's due soon on my bike?" },
  { icon: SearchIcon, text: 'Recommended tyre pressure' },
]

export default function AskAI() {
  const { activeBike } = useBikes()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

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
      if (data?.error) throw new Error(data.error)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data?.answer || "Sorry, I couldn't find an answer.",
          truncated: !!data?.truncated,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `I ran into a problem reaching the AI service. ${err.message || ''}`, failed: true, retryText: question },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-light dark:bg-bg-dark">
      <div className="px-6 pt-14 pb-4 shrink-0 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber/15 flex items-center justify-center shrink-0">
            <BotIcon size={20} className="text-amber" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-extrabold leading-tight">Ask AI</h1>
            <p className="text-ink/45 dark:text-white/45 text-[13px] mt-0.5 truncate">
              {activeBike ? `Tuned to your ${activeBike.name}` : 'Maintenance, mileage & mods'}
            </p>
          </div>
        </div>

        {/* Always visible, not buried at the bottom of an empty state you
            scroll past after the first message — the reliability note
            stays in view (compact) for the whole conversation. */}
        <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-surface-muted dark:bg-surface-darkmuted px-3 py-2.5">
          <SearchIcon size={13} className="text-ink/40 dark:text-white/40 mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-snug text-ink/50 dark:text-white/50">
            Answers use live web search for model-specific numbers, but can still be wrong — verify anything safety-critical in your owner's manual.
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        {messages.length === 0 ? (
          <div className="flex flex-col pt-8 pb-6">
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-16 h-16 rounded-2xl bg-amber/15 flex items-center justify-center mb-4">
                <BotIcon size={28} className="text-amber" />
              </div>
              <p className="font-display font-bold text-lg">Ask me anything</p>
              <p className="text-ink/45 dark:text-white/45 text-sm mt-1 max-w-[260px]">
                {activeBike ? `About your ${activeBike.name} — service, mileage, mods, or anything else.` : 'About maintenance, mileage, mods, or anything else on two wheels.'}
              </p>
            </div>

            <p className="text-ink/35 dark:text-white/35 text-[11px] font-semibold uppercase tracking-wide mb-2.5 px-1">Try asking</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PROMPTS.map(({ icon: PromptIcon, text }) => (
                <button
                  key={text}
                  onClick={() => send(text)}
                  className="tap flex flex-col gap-2.5 rounded-2xl bg-surface-muted dark:bg-surface-darkmuted px-3.5 py-3.5 text-left h-[104px]"
                >
                  <span className="w-9 h-9 rounded-full bg-amber/15 flex items-center justify-center shrink-0">
                    <PromptIcon size={16} className="text-amber" />
                  </span>
                  <span className="text-[13px] font-semibold text-ink dark:text-white leading-snug">{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-5">
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} onRetry={() => send(m.retryText)} />
            ))}
            {busy && (
              <div className="flex items-end gap-2.5">
                <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center shrink-0">
                  <BotIcon size={14} className="text-ink/60 dark:text-white/60" />
                </div>
                <div className="bg-surface-muted dark:bg-surface-darkmuted rounded-2xl rounded-bl-md px-4 py-3.5 flex items-center gap-1.5">
                  <TypingDot delay="0ms" /><TypingDot delay="150ms" /><TypingDot delay="300ms" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}>
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="input flex-1"
            placeholder="Ask about your bike…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()} className="tap w-12 h-12 rounded-full bg-amber flex items-center justify-center shrink-0 disabled:opacity-40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

function TypingDot({ delay }) {
  return <span className="w-1.5 h-1.5 rounded-full bg-ink/30 dark:bg-white/30 animate-bounce" style={{ animationDelay: delay }} />
}

function ChatBubble({ message, onRetry }) {
  const { role, content, failed, truncated } = message

  if (role === 'user') {
    return (
      <div className="self-end max-w-[85%] ml-auto">
        <div className="bg-ink text-white dark:bg-white dark:text-ink rounded-[20px] rounded-br-md px-4 py-3 whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2.5 max-w-[92%]">
      <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center shrink-0 mb-0.5">
        <BotIcon size={14} className="text-ink/60 dark:text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={
            'rounded-[20px] rounded-bl-md px-4 py-3.5 text-[15px] leading-[1.55] shadow-sm ' +
            (failed
              ? 'bg-red-500/10 text-red-500 dark:text-red-400'
              : 'bg-surface-muted dark:bg-surface-darkmuted text-ink dark:text-white')
          }
        >
          {failed ? (
            <div className="flex items-start gap-2">
              <WarningIcon size={16} className="mt-0.5 shrink-0" />
              <span>{content}</span>
            </div>
          ) : (
            <FormattedAnswer text={content} />
          )}
        </div>
        {truncated && (
          <p className="text-[11px] text-ink/35 dark:text-white/35 mt-1.5 px-1">Answer may be cut off — ask "continue" for more.</p>
        )}
        {failed && (
          <button onClick={onRetry} className="text-[13px] font-semibold text-amber mt-1.5 px-1">Try again</button>
        )}
      </div>
    </div>
  )
}

// Renders the AI's answer with basic markdown-style structure (bold text,
// bullet lists, numbered lists) instead of dumping raw "**" and "-"
// characters onto the screen as a wall of plain text.
function FormattedAnswer({ text }) {
  const lines = text.split('\n')
  const blocks = []
  let listBuffer = []
  let listType = null

  const flushList = () => {
    if (listBuffer.length === 0) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    blocks.push(
      <Tag key={blocks.length} className={Tag === 'ol' ? 'list-decimal pl-5 space-y-1 my-1.5' : 'list-disc pl-5 space-y-1 my-1.5'}>
        {listBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </Tag>
    )
    listBuffer = []
    listType = null
  }

  lines.forEach((raw) => {
    const line = raw.trim()
    const bulletMatch = /^[-*•]\s+(.*)/.exec(line)
    const numberMatch = /^\d+[.)]\s+(.*)/.exec(line)

    if (bulletMatch) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuffer.push(bulletMatch[1])
    } else if (numberMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuffer.push(numberMatch[1])
    } else {
      flushList()
      if (line) blocks.push(<p key={blocks.length} className="my-1.5 first:mt-0">{renderInline(line)}</p>)
    }
  })
  flushList()

  return <div className="[&>*:last-child]:mb-0 [&>*:first-child]:mt-0">{blocks}</div>
}

// Turns **bold** segments into <strong> without pulling in a full markdown
// parser dependency for what's otherwise plain text.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

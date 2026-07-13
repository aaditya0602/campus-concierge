import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, assistantApi } from '../api'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  sources?: string[]
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)

  const recognitionRef = useRef<InstanceType<NonNullable<Window['webkitSpeechRecognition']>> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const speechSupported = typeof window !== 'undefined' && !!(window.webkitSpeechRecognition || window.SpeechRecognition)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open])

  const speak = (text: string) => {
    if (muted || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'
    window.speechSynthesis.speak(utter)
  }

  const send = async (query: string) => {
    const text = query.trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await assistantApi.ask(text)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, sources: res.sources }])
      speak(res.answer)
    } catch (e: unknown) {
      const friendly =
        e instanceof ApiError
          ? e.message.includes('404') || e.message.toLowerCase().includes('not found')
            ? "The assistant isn't configured yet. Please check back later."
            : e.message
          : "The assistant isn't configured yet. Please check back later."
      setMessages((m) => [...m, { role: 'assistant', text: friendly }])
    } finally {
      setSending(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const toggleMic = () => {
    const Ctor = window.webkitSpeechRecognition || window.SpeechRecognition
    if (!Ctor) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40">
      {open && (
        <div className="mx-auto flex h-96 max-w-2xl flex-col rounded-t-xl border border-b-0 border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500">Ask me anything about campus &mdash; buses, dining, events.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-vt-maroon text-white'
                    : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && <div className="text-xs text-neutral-500">Thinking&hellip;</div>}
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-neutral-200 p-2 dark:border-neutral-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Concierge..."
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                title="Voice input"
                className={`rounded-full p-2 text-white ${listening ? 'animate-pulse bg-red-500' : 'bg-vt-orange'}`}
              >
                {listening ? '●' : '🎤'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              title={muted ? 'Unmute replies' : 'Mute replies'}
              className="rounded-full bg-neutral-200 p-2 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              type="submit"
              className="rounded-md bg-vt-maroon px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-t-xl bg-vt-maroon px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
      >
        {open ? 'Close Assistant' : 'Ask Campus Concierge'}
      </button>
    </div>
  )
}

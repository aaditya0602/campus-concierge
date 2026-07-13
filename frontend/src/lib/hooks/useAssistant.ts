// Assistant chat/mic/TTS logic, extracted verbatim from the old AssistantPanel.tsx
// so the new ChatWidget sheet is a pure re-skin.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, assistantApi } from '@/api'
import { onVoiceState, speak as ttsSpeak, stopSpeaking, type VoiceState } from '@/lib/tts'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  sources?: string[]
}

export function useAssistant() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')

  const recognitionRef = useRef<InstanceType<NonNullable<Window['webkitSpeechRecognition']>> | null>(null)
  const speechSupported =
    typeof window !== 'undefined' && !!(window.webkitSpeechRecognition || window.SpeechRecognition)

  useEffect(() => onVoiceState(setVoiceState), [])

  const speak = (text: string) => {
    if (muted) return
    ttsSpeak(text)
  }

  const toggleMuted = () => {
    setMuted((v) => {
      if (!v) stopSpeaking()
      return !v
    })
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

  return {
    input,
    setInput,
    messages,
    sending,
    listening,
    muted,
    toggleMuted,
    voiceState,
    speechSupported,
    submit,
    toggleMic,
  }
}

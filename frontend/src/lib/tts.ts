// High-quality TTS via Kokoro (kokoro-js), fully in-browser.
// The ~86MB model downloads once on first use (then browser-cached); until it's
// ready, replies fall back to the native speechSynthesis voice so audio always works.
// kokoro-js is imported dynamically so its (large) code + the transformers.js
// runtime stay out of the initial bundle and load only on first spoken reply.
import type { KokoroTTS } from 'kokoro-js'

type KokoroModule = typeof import('kokoro-js')

let modPromise: Promise<KokoroModule> | null = null

function loadModule(): Promise<KokoroModule> {
  if (!modPromise) modPromise = import('kokoro-js')
  return modPromise
}

export type VoiceState = 'idle' | 'loading' | 'ready' | 'error'

let state: VoiceState = 'idle'
const listeners = new Set<(s: VoiceState) => void>()

function setState(s: VoiceState) {
  state = s
  listeners.forEach((l) => l(s))
}

export function onVoiceState(cb: (s: VoiceState) => void): () => void {
  listeners.add(cb)
  cb(state)
  return () => {
    listeners.delete(cb)
  }
}

let ttsPromise: Promise<KokoroTTS> | null = null

function loadTTS(): Promise<KokoroTTS> {
  if (!ttsPromise) {
    setState('loading')
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
    ttsPromise = loadModule()
      .then((m) =>
        m.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          dtype: hasWebGPU ? 'fp32' : 'q8',
          device: hasWebGPU ? 'webgpu' : 'wasm',
        })
      )
      .then(
      (tts) => {
        setState('ready')
        return tts
      },
      (e) => {
        setState('error')
        ttsPromise = null
        throw e
      }
    )
  }
  return ttsPromise
}

// Sequential playback queue; `session` invalidates in-flight generation/playback
// when a new speak() or stopSpeaking() supersedes it.
let session = 0
let queue: Blob[] = []
let playing = false
let currentAudio: HTMLAudioElement | null = null

function playNext(mySession: number) {
  if (mySession !== session) return
  const blob = queue.shift()
  if (!blob) {
    playing = false
    return
  }
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  audio.onended = () => {
    URL.revokeObjectURL(url)
    playNext(mySession)
  }
  audio.onerror = () => {
    URL.revokeObjectURL(url)
    playNext(mySession)
  }
  void audio.play()
}

export function stopSpeaking() {
  session++
  queue = []
  playing = false
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

function fallbackSpeak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  window.speechSynthesis.speak(utter)
}

async function speakKokoro(text: string, mySession: number) {
  const [tts, { TextSplitterStream }] = await Promise.all([loadTTS(), loadModule()])
  if (mySession !== session) return
  const splitter = new TextSplitterStream()
  const stream = tts.stream(splitter, { voice: 'af_heart' })
  splitter.push(text)
  splitter.close()
  for await (const { audio } of stream) {
    if (mySession !== session) return
    queue.push(audio.toBlob())
    if (!playing) {
      playing = true
      playNext(mySession)
    }
  }
}

export function speak(text: string) {
  stopSpeaking()
  const mySession = session
  if (state === 'ready') {
    speakKokoro(text, mySession).catch(() => {
      if (mySession === session) fallbackSpeak(text)
    })
  } else {
    // Kick off (or continue) the model download for future replies; speak this
    // one with the native voice so the user isn't left waiting.
    loadTTS().catch(() => {})
    fallbackSpeak(text)
  }
}

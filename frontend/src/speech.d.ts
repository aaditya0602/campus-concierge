// Minimal Web Speech API (webkitSpeechRecognition) shim.
// Not in standard TS DOM lib; only the surface AssistantPanel.tsx uses.

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface Window {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
  SpeechRecognition?: new () => SpeechRecognitionLike
}

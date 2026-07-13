import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Mic, Send, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAssistant } from '@/lib/hooks/useAssistant'
import { cn } from '@/lib/utils'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const { input, setInput, messages, sending, listening, muted, toggleMuted, voiceState, speechSupported, submit, toggleMic } =
    useAssistant()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Open Campus Concierge Assistant"
        className={cn(
          'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary shadow-lg',
          'animate-[pulse_2.5s_ease-in-out_infinite]'
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Campus Concierge Assistant</SheetTitle>
          </SheetHeader>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask me anything about campus &mdash; buses, dining, events.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-1.5 text-sm animate-fade-up',
                  m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                {m.text}
              </div>
            ))}
            {sending && <div className="text-xs text-muted-foreground">Thinking&hellip;</div>}
            {!muted && voiceState === 'loading' && (
              <div className="text-xs text-muted-foreground">
                Downloading high-quality voice (one-time)&hellip; using standard voice meanwhile.
              </div>
            )}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Concierge..."
              className="flex-1"
            />
            {speechSupported && (
              <Button
                type="button"
                variant={listening ? 'destructive' : 'accent'}
                size="icon"
                onClick={toggleMic}
                title="Voice input"
                className={cn(listening && 'animate-pulse')}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={toggleMuted}
              title={muted ? 'Unmute replies' : 'Mute replies'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button type="submit" size="icon" title="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}

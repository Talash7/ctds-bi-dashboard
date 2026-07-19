import { useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  isError?: boolean
}

const SUGGESTIONS = [
  'Which students are at risk of failing?',
  "What's the average GPA in level 3?",
  'Show me the Dean\'s List',
  'What is the overall pass rate?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function ask(question: string) {
    if (!question.trim() || loading) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { question },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Something went wrong answering that.',
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">AI Chat</h1>
        <p className="text-muted-foreground">
          Ask natural-language questions about students, courses, and results.
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-md border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Ask a question to get started.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <Card
              className={cn(
                'max-w-[75%]',
                m.role === 'user' && 'bg-primary text-primary-foreground',
                m.isError && 'border-destructive',
              )}
            >
              <CardContent className="px-4 py-2.5">
                <p className={cn('text-sm whitespace-pre-wrap', m.isError && 'text-destructive')} dir="auto">
                  {m.text}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <Card>
              <CardContent className="px-4 py-2.5">
                <p className="text-sm text-muted-foreground">Thinking…</p>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about students, courses, or results…"
          dir="auto"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}

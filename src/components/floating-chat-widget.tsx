'use client';

/**
 * FloatingChatWidget
 *
 * A persistent bottom-right chat widget that lives in the root layout.
 * - Only visible when the user is authenticated
 * - Excluded from landing / auth pages
 * - Maintains full conversation history in React state (session memory)
 * - Calls /api/chat (which handles Groq + history)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, X, Send, Loader2, Minimize2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Pages where the widget should NOT appear (public / auth pages)
const EXCLUDED_PATHS = new Set(['/', '/login', '/signup']);

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

export function FloatingChatWidget() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auth check ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthed(!!session);
      if (!session) {
        setIsOpen(false);
        setMessages([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector('div');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // ── Focus input when opened ───────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Send message ──────────────────────────────────────────────
  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const question = input.trim();
      if (!question || isLoading) return;

      // Snapshot history before adding new message
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const userMsg: Message = { id: Date.now(), role: 'user', content: question };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history: historyForApi }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Request failed');
        }

        const aiMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.data.answer,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Show unread badge if widget is closed
        if (!isOpen) setHasUnread(true);
      } catch (err: any) {
        const errMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, I could not get a response right now. Please try again.',
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, isOpen]
  );

  // ── Gate: don't render on excluded pages or if not authed ─────
  if (!isAuthed || EXCLUDED_PATHS.has(pathname)) return null;

  return (
    <>
      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50',
          'w-[340px] max-w-[calc(100vw-1.5rem)]',
          'rounded-2xl border border-white/10 shadow-2xl',
          'bg-[#0f1117]/95 backdrop-blur-xl',
          'flex flex-col overflow-hidden',
          'transition-all duration-300 ease-in-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{ height: '460px' }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Legal AI</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ask any legal question</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/chat" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="sr-only">Open full chat</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="sr-only">Minimize</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 py-3" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Bot className="h-8 w-8 mx-auto text-primary/40" />
                <p className="text-xs text-muted-foreground">
                  Hi! Ask me anything about contracts or legal terms.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-2',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-6 w-6 flex-shrink-0 mb-0.5">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <Bot size={12} />
                    </AvatarFallback>
                  </Avatar>
                )}
                {msg.role === 'assistant' ? (
                  <div className="max-w-[240px] rounded-xl bg-[#1a1a2e] border border-white/10 px-3 py-2 font-mono text-xs text-white leading-relaxed rounded-bl-sm">
                    {msg.content.split('\n').map((line, i) => (
                      <span key={i} className="block">{line || '\u00A0'}</span>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-[240px] rounded-2xl px-3 py-2 text-xs leading-relaxed bg-primary text-primary-foreground rounded-br-sm">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <Bot size={12} />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-white/10 px-3 py-2.5">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a legal question..."
              className="flex-1 h-8 text-xs bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/60"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
          {messages.length > 0 && (
            <button
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground mt-1.5 ml-0.5 transition-colors"
              onClick={() => setMessages([])}
              type="button"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-14 w-14 rounded-full shadow-2xl',
          'flex items-center justify-center',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isOpen ? 'scale-90' : 'scale-100 hover:scale-105'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open AI chat'}
      >
        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
            1
          </span>
        )}

        <span
          className={cn(
            'absolute transition-all duration-200',
            isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
          )}
        >
          <X className="h-5 w-5 text-primary-foreground" />
        </span>
        <span
          className={cn(
            'absolute transition-all duration-200',
            isOpen ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          )}
        >
          <Bot className="h-5 w-5 text-primary-foreground" />
        </span>
      </button>
    </>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, Loader2, FileText, Trash2 } from 'lucide-react';
import { Header } from '@/components/header';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import type { Contract, Clause } from '@/lib/types';

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Message = {
  id: number;
  sender: 'user' | 'ai';
  text: string;
};

// ──────────────────────────────────────────────────────────────────
// Main chat component
// ──────────────────────────────────────────────────────────────────

function ChatPageComponent() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('none');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingContracts, setIsFetchingContracts] = useState(true);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // ── Fetch analyzed contracts ──────────────────────────────────
  useEffect(() => {
    async function loadContracts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contract_analyses')
        .select('id, file_name, status, risk_level, clauses_count, analyzed_at, analysis_data')
        .eq('user_id', user.id)
        .eq('status', 'Analyzed')
        .order('analyzed_at', { ascending: false });

      if (!error && data) {
        setContracts(
          data.map((item: any): Contract => ({
            id: item.id,
            name: item.file_name,
            status: item.status,
            riskLevel: item.risk_level,
            clauses: item.clauses_count,
            analyzedAt: item.analyzed_at,
            analysis_data: item.analysis_data,
          }))
        );
      }
      setIsFetchingContracts(false);
    }
    loadContracts();
  }, []);

  // ── Auto-scroll on new messages ───────────────────────────────
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  // ── Derive contract text from selected contract ───────────────
  const selectedContract = contracts.find((c) => c.id === selectedContractId);
  const contractText =
    selectedContract && Array.isArray(selectedContract.analysis_data)
      ? (selectedContract.analysis_data as Clause[])
          .map((cl) => cl.clauseText)
          .join('\n\n')
      : '';

  // ── Send a message ────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    // Snapshot history BEFORE adding the new message
    const historyForApi: HistoryMessage[] = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const userMsg: Message = { id: Date.now(), sender: 'user', text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText: contractText || undefined,
          question,
          history: historyForApi,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not get a response.');
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: result.data.answer,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
      });
      // Remove the user message if API call failed
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    toast({ title: 'Conversation cleared' });
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#0B0C10] to-[#1A1A2E] text-white">
      <Header />

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            AI Legal Chat
          </h1>
          <p className="text-lg text-muted-foreground">
            Ask questions about your contracts or any legal topic. The AI remembers your conversation.
          </p>
        </div>

        {/* Contract Context Selector */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Contract Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFetchingContracts ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your contracts...
              </div>
            ) : (
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger className="bg-transparent border-border">
                  <SelectValue placeholder="Select a contract for context (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contract — General legal Q&amp;A</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.riskLevel} risk
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedContractId !== 'none' && selectedContract && (
              <p className="mt-2 text-xs text-muted-foreground">
                Context active: <span className="text-primary font-medium">{selectedContract.name}</span>
                {' '}({selectedContract.clauses} clauses)
              </p>
            )}
            {contracts.length === 0 && !isFetchingContracts && (
              <p className="mt-2 text-xs text-muted-foreground">
                No analyzed contracts yet.{' '}
                <a href="/analyze" className="text-primary underline">
                  Analyze one
                </a>{' '}
                to use it as context.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="glass-card flex-1 flex flex-col min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Conversation
              {messages.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({Math.floor(messages.length / 2)} exchanges)
                </span>
              )}
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-muted-foreground hover:text-destructive h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-16 space-y-3">
                  <Bot className="h-10 w-10 mx-auto text-primary/50" />
                  <p className="font-medium">Start a conversation</p>
                  <div className="text-sm space-y-1">
                    <p>Try asking:</p>
                    <p className="font-mono bg-white/5 rounded px-3 py-1.5 inline-block">
                      &quot;What are the key risks in this contract?&quot;
                    </p>
                    <br />
                    <p className="font-mono bg-white/5 rounded px-3 py-1.5 inline-block">
                      &quot;Explain the indemnification clause&quot;
                    </p>
                    <br />
                    <p className="font-mono bg-white/5 rounded px-3 py-1.5 inline-block">
                      &quot;What is force majeure?&quot;
                    </p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-3',
                    message.sender === 'user' ? 'justify-end' : ''
                  )}
                >
                  {message.sender === 'ai' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot size={16} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {message.sender === 'ai' ? (
                    <div className="max-w-2xl rounded-xl bg-[#1a1a2e] border border-white/10 px-4 py-3 font-mono text-sm text-white leading-relaxed">
                      {message.text.split('\n').map((line, i) => (
                        <span key={i} className="block">{line || '\u00A0'}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground">
                      {message.text}
                    </div>
                  )}
                  {message.sender === 'user' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-slate-700">
                        <User size={16} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-white/10 p-4">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedContractId !== 'none'
                    ? `Ask about "${selectedContract?.name}"...`
                    : 'Ask any legal question...'
                }
                className="flex-1 bg-white/5 border-border"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              The AI remembers your conversation within this session.
            </p>
          </div>
        </Card>
      </main>

      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t border-white/10">
        <p>&copy; {new Date().getFullYear()} Legal Decoder. This is not legal advice.</p>
      </footer>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatPageComponent />
    </AuthGuard>
  );
}

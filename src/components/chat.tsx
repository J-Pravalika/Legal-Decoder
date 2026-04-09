'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { AnswerContractQuestionsOutput } from '@/ai/flows/answer-contract-questions';

type Message = {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  clauseText?: string;
  explanation?: string;
};

type ChatProps = {
  contractText: string;
};

export default function Chat({ contractText }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Capture history BEFORE adding the new user message
    const historyForApi = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText, question: input, history: historyForApi }),
      });
      
      const result: { success: boolean; data: AnswerContractQuestionsOutput | null, error: string | null } = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "An error occurred");
      }

      if (result.success && result.data) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: 'ai',
          text: result.data.answer,
          clauseText: result.data.clauseText,
          explanation: result.data.explanation,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(result.error || 'Could not get a response.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'An Unexpected Error Occurred',
        description: error.message || 'Please try again.',
      });
       setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      // The viewport is the first div inside the ScrollArea root
      const scrollableView = scrollAreaRef.current.querySelector('div');
      if (scrollableView) {
          scrollableView.scrollTo({
          top: scrollableView.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages]);


  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
             <div className="text-center text-muted-foreground p-8">
                <p className="mb-2">Start the conversation by asking a question, for example:</p>
                <p className="font-mono text-sm bg-muted p-2 rounded-md inline-block">"Explain the confidentiality clause in simple terms"</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-4',
                message.sender === 'user' ? 'justify-end' : ''
              )}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-md rounded-lg p-3 text-sm',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
               {message.sender === 'ai' ? (
                  <div className="space-y-4">
                    <p className="font-semibold">{message.text}</p>
                    {message.clauseText && (
                       <Card className="bg-background/50">
                          <CardHeader className="p-3">
                            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Relevant Clause</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p className="font-mono text-xs text-foreground/80">{message.clauseText}</p>
                          </CardContent>
                        </Card>
                    )}
                     {message.explanation && (
                       <div>
                         <p className="text-xs uppercase tracking-wider font-semibold text-primary mb-2">Explanation</p>
                         <p>{message.explanation}</p>
                       </div>
                    )}
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
              {message.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User size={18} />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
               <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
              <div className="max-w-md rounded-lg p-3 bg-muted">
                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your contract..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

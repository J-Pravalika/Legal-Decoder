
import { NextResponse } from 'next/server';
import { groq, GROQ_MODEL } from '@/ai/genkit';

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: Request) {
  const { contractText, question, history } = await req.json();

  if (!question || !question.trim()) {
    return NextResponse.json(
      { success: false, error: 'Missing question.', data: null },
      { status: 400 }
    );
  }

  const contractContext = contractText
    ? `\n\nContract Context (use this to answer questions):\n---\n${String(contractText).slice(0, 40_000)}\n---`
    : '';

  const systemPrompt = `You are a concise legal assistant. Answer in plain English using EXACTLY this format — no exceptions:

Summary: [one sentence, max 15 words]

Key Risks:
• [point 1]
• [point 2]
• [point 3]
• [point 4 — optional]
• [point 5 — optional]

RULES:
- Always start with "Summary:" label
- Always use "Key Risks:" label before bullets
- 3–5 bullets max, each on its own line starting with "•"
- Plain English, no jargon
- Under 120 words total
- Never write paragraphs${contractContext}`;

  // Sanitise and limit history to last 10 turns
  const conversationHistory: HistoryMessage[] = Array.isArray(history)
    ? (history as HistoryMessage[])
        .filter((m) => m.role && m.content)
        .slice(-10)
        .map((m) => ({ role: m.role, content: String(m.content) }))
    : [];

  try {
    const res = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: question },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const answer =
      res.choices[0].message.content?.trim() || 'I could not generate a response.';

    return NextResponse.json({ success: true, data: { answer }, error: null });
  } catch (error: any) {
    console.error('[/api/chat] Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get a response. The AI model may be unavailable.',
        data: null,
      },
      { status: 500 }
    );
  }
}

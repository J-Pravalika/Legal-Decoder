'use server';

import { groq, GROQ_MODEL } from '@/ai/genkit';
import {
  DetectAndLabelClausesOutputSchema,
  type DetectAndLabelClausesInput,
  type DetectAndLabelClausesOutput,
} from '@/ai/schemas/detect-and-label-clauses-schema';

const MAX_CONTRACT_CHARS = 80_000;

function trimContractText(text: string): string {
  if (text.length <= MAX_CONTRACT_CHARS) return text;

  const truncated = text.slice(0, MAX_CONTRACT_CHARS);
  const lastBoundary = Math.max(
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('\n\n')
  );
  const cutAt = lastBoundary > MAX_CONTRACT_CHARS * 0.8 ? lastBoundary + 1 : MAX_CONTRACT_CHARS;

  console.warn(`[detect-and-label-clauses] Contract trimmed from ${text.length} → ${cutAt} chars`);
  return truncated.slice(0, cutAt).trimEnd();
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 5_000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.toLowerCase().includes('quota') ||
        err?.message?.toLowerCase().includes('rate limit');

      if (is429 && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[detect-and-label-clauses] Rate limited — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unreachable');
}

export async function detectAndLabelClauses(
  input: DetectAndLabelClausesInput
): Promise<DetectAndLabelClausesOutput> {
  const contractText = trimContractText(input.contractText);

  const res = await withRetry(() =>
    groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional legal assistant AI specializing in contract risk analysis.

Given a contract text, perform the following:
1. Detect Clauses: For each clause identify:
   - clauseType: type (e.g. Confidentiality, Liability, Termination, Jurisdiction)
   - clauseText: the full original text of the clause
   - summary: plain English summary (2-3 lines)
   - riskLevel: "Low", "Medium", or "High"
   - riskReason: clear reason for the risk rating
   - recommendation: actionable mitigation steps
2. Extract Emails: find all email addresses in the text.

Return ONLY a valid JSON object with this exact shape:
{
  "clauses": [{ "clauseType": "...", "clauseText": "...", "summary": "...", "riskLevel": "Low|Medium|High", "riskReason": "...", "recommendation": "..." }],
  "extractedEmails": ["email@example.com"]
}`,
        },
        {
          role: 'user',
          content: `Analyze the following contract:\n\n${contractText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })
  );

  const raw = JSON.parse(res.choices[0].message.content!);
  return DetectAndLabelClausesOutputSchema.parse(raw);
}

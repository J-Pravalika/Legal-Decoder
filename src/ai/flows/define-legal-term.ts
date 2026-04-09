'use server';

import { groq, GROQ_MODEL } from '@/ai/genkit';
import { z } from 'zod';

const DefineLegalTermInputSchema = z.object({
  term: z.string(),
});
export type DefineLegalTermInput = z.infer<typeof DefineLegalTermInputSchema>;

const DefineLegalTermOutputSchema = z.object({
  term: z.string(),
  simpleExplanation: z.string(),
  standardWording: z.string(),
  implicationsAndRisks: z.string(),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
});
export type DefineLegalTermOutput = z.infer<typeof DefineLegalTermOutputSchema>;

export async function defineLegalTerm(
  input: DefineLegalTermInput
): Promise<DefineLegalTermOutput> {
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert legal dictionary AI. Provide a comprehensive definition for the given legal term.

Return ONLY a valid JSON object:
{
  "term": "exact term as provided",
  "simpleExplanation": "concise plain-English explanation",
  "standardWording": "typical example of how this term appears in a legal contract",
  "implicationsAndRisks": "key implications and risks the user should know",
  "riskLevel": "Low|Medium|High"
}`,
      },
      {
        role: 'user',
        content: `Define this legal term: "${input.term}"`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = JSON.parse(res.choices[0].message.content!);
  return DefineLegalTermOutputSchema.parse(raw);
}

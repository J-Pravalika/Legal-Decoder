'use server';

import { groq, GROQ_MODEL } from '@/ai/genkit';
import { z } from 'zod';

const AnswerContractQuestionsInputSchema = z.object({
  contractText: z.string(),
  question: z.string(),
});
export type AnswerContractQuestionsInput = z.infer<typeof AnswerContractQuestionsInputSchema>;

const AnswerContractQuestionsOutputSchema = z.object({
  answer: z.string(),
  clauseText: z.string().optional(),
  explanation: z.string().optional(),
});
export type AnswerContractQuestionsOutput = z.infer<typeof AnswerContractQuestionsOutputSchema>;

export async function answerContractQuestions(
  input: AnswerContractQuestionsInput
): Promise<AnswerContractQuestionsOutput> {
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert legal assistant AI. Answer questions about contracts strictly based on the provided contract text.

Return ONLY a valid JSON object:
{
  "answer": "direct answer to the question",
  "clauseText": "the most relevant clause text (optional, omit if not applicable)",
  "explanation": "brief explanation of how the clause supports the answer (optional, omit if not applicable)"
}`,
      },
      {
        role: 'user',
        content: `Contract:\n${input.contractText}\n\nQuestion: ${input.question}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = JSON.parse(res.choices[0].message.content!);
  return AnswerContractQuestionsOutputSchema.parse(raw);
}

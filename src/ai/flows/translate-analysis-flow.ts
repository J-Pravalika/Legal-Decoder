'use server';

import { groq, GROQ_MODEL } from '@/ai/genkit';
import { z } from 'zod';

const SupportedLanguagesSchema = z.enum(['en', 'hi', 'te', 'ta']);

const TranslateAnalysisInputSchema = z.object({
  analysis: z.object({
    summary: z.string(),
    riskReason: z.string(),
    recommendation: z.string(),
  }),
  targetLanguage: SupportedLanguagesSchema,
});
export type TranslateAnalysisInput = z.infer<typeof TranslateAnalysisInputSchema>;

const TranslateAnalysisOutputSchema = z.object({
  translatedSummary: z.string(),
  translatedRiskReason: z.string(),
  translatedRecommendation: z.string(),
});
export type TranslateAnalysisOutput = z.infer<typeof TranslateAnalysisOutputSchema>;

export async function translateAnalysis(
  input: TranslateAnalysisInput
): Promise<TranslateAnalysisOutput> {
  if (input.targetLanguage === 'en') {
    return {
      translatedSummary: input.analysis.summary,
      translatedRiskReason: input.analysis.riskReason,
      translatedRecommendation: input.analysis.recommendation,
    };
  }

  const languageNames: Record<string, string> = { hi: 'Hindi', te: 'Telugu', ta: 'Tamil' };
  const targetLang = languageNames[input.targetLanguage] ?? input.targetLanguage;

  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional legal translator. Translate the provided legal analysis text into ${targetLang}.
Preserve legal meaning, professional tone, and structure exactly. Do not simplify or paraphrase.

Return ONLY a valid JSON object:
{
  "translatedSummary": "...",
  "translatedRiskReason": "...",
  "translatedRecommendation": "..."
}`,
      },
      {
        role: 'user',
        content: `Summary: ${input.analysis.summary}\nRisk Reason: ${input.analysis.riskReason}\nRecommendation: ${input.analysis.recommendation}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = JSON.parse(res.choices[0].message.content!);
  return TranslateAnalysisOutputSchema.parse(raw);
}

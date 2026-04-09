'use server';

import { groq, GROQ_MODEL } from '@/ai/genkit';
import {
  CompareContractsOutputSchema,
  type CompareContractsInput,
  type CompareContractsOutput,
} from '@/ai/schemas/compare-contracts-schema';

export async function compareContracts(
  input: CompareContractsInput
): Promise<CompareContractsOutput> {
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional legal assistant AI specializing in contract comparison.

Compare Contract A and Contract B and return ONLY a valid JSON object with this exact shape:
{
  "summaryDiff": "high-level summary of the most important differences",
  "summaryA": "standalone summary of key points for Contract A",
  "summaryB": "standalone summary of key points for Contract B",
  "addedClauses": ["clause present in B but not A"],
  "removedClauses": ["clause present in A but not B"],
  "riskDifferences": [
    {
      "clause": "clause name",
      "contractA_risk": "Low|Medium|High",
      "contractB_risk": "Low|Medium|High",
      "contractA_reason": "reason",
      "contractB_reason": "reason"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `**Contract A:**\n${input.contractOneText}\n\n**Contract B:**\n${input.contractTwoText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = JSON.parse(res.choices[0].message.content!);
  return CompareContractsOutputSchema.parse(raw);
}

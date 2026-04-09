import Groq from 'groq-sdk';

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

console.log(`[groq] model: ${GROQ_MODEL} | key set: ${!!process.env.GROQ_API_KEY}`);

/**
 * OCR / Text Extraction Utility
 *
 * Entry point: extractTextFromFile(file)
 *   1. Tries pdf-parse (fast, no network call)
 *   2. Falls back to Nvidia OCR if pdf-parse fails or returns empty text
 *
 * NOTE: Nvidia OCR integration is a placeholder — see extractTextViaOCR().
 * To connect this to the analyze flow in future, call extractTextFromFile()
 * inside the POST handler in src/app/api/analyze/route.ts instead of
 * receiving pre-extracted contractText from the client.
 */

import pdfParse from 'pdf-parse';

// ---------------------------------------------------------------------------
// Primary extractor — pdf-parse (server-side, no network)
// ---------------------------------------------------------------------------

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text.trim();
}

// ---------------------------------------------------------------------------
// Fallback extractor — Nvidia OCR (placeholder)
// ---------------------------------------------------------------------------

/**
 * TODO: Implement Nvidia OCR integration.
 *
 * Steps for future implementation:
 * 1. Set NVIDIA_OCR_API_KEY in .env.local
 * 2. POST the PDF buffer to Nvidia's OCR endpoint
 * 3. Parse the response and return the extracted text string
 *
 * Example endpoint (placeholder — verify with Nvidia docs):
 *   https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/<ocr-function-id>
 */
async function extractTextViaOCR(_buffer: Buffer): Promise<string> {
  const apiKey = process.env.NVIDIA_OCR_API_KEY;

  if (!apiKey) {
    console.warn('[ocr] NVIDIA_OCR_API_KEY not set — returning empty string from OCR placeholder');
    return '';
  }

  // TODO: Replace this with the real Nvidia OCR API call
  // const response = await fetch('https://api.nvcf.nvidia.com/...', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/octet-stream' },
  //   body: _buffer,
  // });
  // const data = await response.json();
  // return data.text ?? '';

  console.warn('[ocr] Nvidia OCR not yet implemented — returning mock text');
  return '[OCR placeholder — Nvidia OCR integration pending]';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract text from an uploaded File (PDF or plain text).
 *
 * Strategy:
 *   - PDF → pdf-parse first; if result is empty, fall back to Nvidia OCR
 *   - TXT → read directly
 *   - Other types → throw an error
 *
 * This function is NOT connected to any route yet.
 * It is ready to be called from src/app/api/analyze/route.ts in future.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === 'text/plain') {
    return buffer.toString('utf-8').trim();
  }

  if (file.type === 'application/pdf') {
    try {
      const text = await extractTextFromPdf(buffer);

      if (text.length > 50) {
        console.log(`[ocr] pdf-parse succeeded — extracted ${text.length} chars`);
        return text;
      }

      // pdf-parse returned too little text (likely a scanned/image-based PDF)
      console.warn('[ocr] pdf-parse returned sparse text — falling back to Nvidia OCR');
      return await extractTextViaOCR(buffer);
    } catch (err) {
      console.error('[ocr] pdf-parse threw an error — falling back to Nvidia OCR:', err);
      return await extractTextViaOCR(buffer);
    }
  }

  throw new Error(`Unsupported file type: ${file.type}. Only PDF and plain text are supported.`);
}

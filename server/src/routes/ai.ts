import { Router, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

// Initialize Google GenAI client if API key is provided
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

interface FileContext {
  name: string;
  content: string;
  language?: string;
}

interface ChatTurn {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

interface AIChatRequestBody {
  prompt: string;
  activeFile?: FileContext;
  selectedCode?: string;
  allFiles?: FileContext[];
  history?: ChatTurn[];
}

/**
 * Builds system instruction and context string based on available files and editor state
 */
function buildPromptWithContext(body: AIChatRequestBody): { systemInstruction: string; userMessage: string } {
  const { prompt, activeFile, selectedCode, allFiles, history } = body;

  const systemInstruction = `You are Collabo AI, a concise, expert collaborative programming assistant inside a real-time web IDE.
Your primary directive is to provide short, precise, and high-impact answers with zero unnecessary fluff.

Strict Guidelines:
1. Extreme Brevity: Answer directly. Omit pleasantries, conversational filler, greetings, and sign-offs (e.g., no "Sure!", "Here is the code", "I hope this helps!", "Let me know if you need anything else").
2. Only Necessary Content: Keep explanations to 1–3 concise sentences or brief bullet points. Do not explain self-explanatory code or repeat the user's prompt.
3. Minimal Code Diffs: When fixing or modifying code, provide ONLY the relevant changed block, function, or snippet rather than reprinting entire files, unless the user explicitly requests the full file.
4. Clean Markdown: Always wrap code snippets in appropriate markdown code fences with accurate language tags (e.g. \`\`\`typescript ... \`\`\`).
5. Production Quality: Keep solutions clean, correct, and directly applicable.`;

  let contextSummary = '';

  if (activeFile) {
    contextSummary += `\n--- ACTIVE FILE: ${activeFile.name} (${activeFile.language || 'code'}) ---\n\`\`\`\n${activeFile.content || '(empty file)'}\n\`\`\`\n`;
  }

  if (selectedCode && selectedCode.trim().length > 0) {
    contextSummary += `\n--- USER SELECTED CODE IN ${activeFile?.name || 'CURRENT FILE'} ---\n\`\`\`\n${selectedCode}\n\`\`\`\n`;
  }

  if (allFiles && allFiles.length > 0) {
    contextSummary += `\n--- PROJECT FILES ---\n`;
    for (const f of allFiles) {
      if (f.name !== activeFile?.name) {
        contextSummary += `File: ${f.name}\n\`\`\`\n${f.content.slice(0, 1000)}${f.content.length > 1000 ? '\n...(truncated)' : ''}\n\`\`\`\n`;
      }
    }
  }

  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = '\n--- PREVIOUS CONVERSATION HISTORY ---\n' + 
      history.slice(-6).map(turn => `${turn.role === 'user' ? 'User' : 'Collabo AI'}: ${turn.text}`).join('\n\n') + '\n';
  }

  const userMessage = `${contextSummary}${historyContext}\n--- USER PROMPT ---\n${prompt}`;

  return { systemInstruction, userMessage };
}

/**
 * Validates the prompt field and checks that the Gemini API key is configured.
 * Returns null on success, or an error descriptor to be forwarded as an HTTP response.
 */
function validateRequest(prompt: unknown): { status: number; body: object } | null {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { status: 400, body: { error: 'A prompt is required.' } };
  }
  const ai = getGenAIClient();
  if (!ai) {
    return {
      status: 503,
      body: {
        error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY in server/.env file.',
        isDemoMock: true,
      },
    };
  }
  return null;
}

/**
 * POST /api/ai/chat
 * Standard non-streaming endpoint
 */
aiRouter.post('/chat', async (req: Request<{}, {}, AIChatRequestBody>, res: Response) => {
  try {
    const { prompt } = req.body;
    const validationError = validateRequest(prompt);
    if (validationError) {
      return res.status(validationError.status).json(validationError.body);
    }

    const ai = getGenAIClient()!;
    const { systemInstruction, userMessage } = buildPromptWithContext(req.body);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText = response.text || 'No response generated.';
    return res.json({
      text: replyText,
      model: modelName,
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate AI response. Please check server logs and API quota.',
    });
  }
});

/**
 * POST /api/ai/stream
 * Server-Sent Events (SSE) streaming endpoint
 */
aiRouter.post('/stream', async (req: Request<{}, {}, AIChatRequestBody>, res: Response) => {
  try {
    const { prompt } = req.body;
    const validationError = validateRequest(prompt);
    if (validationError) {
      // For the streaming endpoint, surface config errors over SSE so the client
      // can display them inline rather than as a hard HTTP error.
      if (validationError.status === 503) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ error: 'GEMINI_API_KEY is not configured in server/.env. Please configure your API key.' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      return res.status(validationError.status).json(validationError.body);
    }

    const ai = getGenAIClient()!;
    const { systemInstruction, userMessage } = buildPromptWithContext(req.body);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const streamResponse = await ai.models.generateContentStream({
      model: modelName,
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('AI Streaming Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Streaming failed.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming interrupted.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

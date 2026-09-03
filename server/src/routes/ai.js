import { Router } from 'express';
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
/**
 * Builds system instruction and context string based on available files and editor state
 */
function buildPromptWithContext(body) {
    const { prompt, activeFile, selectedCode, allFiles, history } = body;
    const systemInstruction = `You are CodeSync AI, an expert collaborative programming assistant inside a real-time web IDE.
Your purpose is to help developers understand code, fix bugs, optimize algorithms, write tests, and explain concepts.
Follow these guidelines:
1. Provide concise, clean, and production-ready code with explanations.
2. Always wrap code snippets in appropriate markdown code fences with language tags (e.g. \`\`\`typescript ... \`\`\`).
3. If giving a complete replacement for a file, make it easy to copy.
4. Be direct, friendly, and prioritize clarity.`;
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
            history.slice(-6).map(turn => `${turn.role === 'user' ? 'User' : 'CodeSync AI'}: ${turn.text}`).join('\n\n') + '\n';
    }
    const userMessage = `${contextSummary}${historyContext}\n--- USER PROMPT ---\n${prompt}`;
    return { systemInstruction, userMessage };
}
/**
 * POST /api/ai/chat
 * Standard non-streaming endpoint
 */
aiRouter.post('/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: 'A prompt is required.' });
        }
        const ai = getGenAIClient();
        if (!ai) {
            return res.status(503).json({
                error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY in server/.env file.',
                isDemoMock: true,
            });
        }
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
    }
    catch (error) {
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
aiRouter.post('/stream', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: 'A prompt is required.' });
        }
        const ai = getGenAIClient();
        if (!ai) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.write(`data: ${JSON.stringify({ error: 'GEMINI_API_KEY is not configured in server/.env. Please configure your API key.' })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }
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
    }
    catch (error) {
        console.error('AI Streaming Error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: error?.message || 'Streaming failed.' });
        }
        else {
            res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming interrupted.' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
});
//# sourceMappingURL=ai.js.map
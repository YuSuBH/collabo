import { Router } from 'express';
export const executeRouter = Router();
// ─── Allowed Compilers ───────────────────────────────────────────────────────
// Guard against arbitrary compiler injection from the client.
const ALLOWED_COMPILERS = new Set([
    'nodejs-20.17.0',
    'cpython-3.12.7',
    'typescript-5.6.2',
]);
const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';
// ─── POST /api/execute ────────────────────────────────────────────────────────
executeRouter.post('/', async (req, res) => {
    const { compiler, code, codes, stdin } = req.body;
    // Validation
    if (!compiler || typeof compiler !== 'string') {
        return res.status(400).json({ error: 'compiler field is required.' });
    }
    if (!ALLOWED_COMPILERS.has(compiler)) {
        return res.status(400).json({
            error: `Unsupported compiler: "${compiler}". Allowed: ${[...ALLOWED_COMPILERS].join(', ')}.`,
        });
    }
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'code field is required.' });
    }
    const payload = {
        compiler,
        code,
        stdin: typeof stdin === 'string' ? stdin : '',
    };
    if (Array.isArray(codes) && codes.length > 0) {
        payload.codes = codes;
    }
    try {
        const wandboxRes = await fetch(WANDBOX_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!wandboxRes.ok) {
            const errText = await wandboxRes.text().catch(() => 'Unknown error');
            console.error(`[Execute] Wandbox HTTP ${wandboxRes.status}: ${errText}`);
            return res.status(502).json({
                error: `Wandbox returned HTTP ${wandboxRes.status}. The service may be temporarily unavailable.`,
            });
        }
        const data = (await wandboxRes.json());
        return res.json({
            status: data.status ?? '-1',
            program_output: data.program_output ?? '',
            program_error: data.program_error ?? '',
            compiler_error: data.compiler_error ?? data.compiler_output ?? '',
        });
    }
    catch (err) {
        console.error('[Execute] Network/proxy error:', err);
        return res.status(503).json({
            error: 'Could not reach Wandbox. Check your internet connection or try again later.',
        });
    }
});
//# sourceMappingURL=execute.js.map
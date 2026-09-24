import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API client on the server
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Endpoint for High-Thinking Clinical Pharmacist & Expiry Inventory Intelligence
  // Uses gemini-3.1-pro-preview with thinkingLevel: ThinkingLevel.HIGH as mandated
  app.post('/api/ai/pharmacist-consult', async (req, res) => {
    try {
      const { prompt, queryType, inventoryContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API is not configured. Please ensure GEMINI_API_KEY is configured in your environment.',
        });
      }

      const systemInstruction = `You are a Chief Clinical Pharmacist and Pharmaceutical Regulatory & Inventory Specialist for a high-volume community and retail pharmacy drug shop.
You possess deep expertise in:
1. Expiry date mitigation strategies (FEFO - First Expired, First Out prioritization, supplier return windows before cut-off, bundling, markdown calculations).
2. Pharmaceutical disposal compliance (WHO, FDA, DEA guidelines for hazardous waste, cytotoxic medications, narcotics witness disposal, biologicals inactivation).
3. Drug interactions, therapeutic alternatives, and safe substitution for near-expiry or recalled stock.
4. Cold chain stability (2-8°C), room temperature drift, and degradation kinetics of active pharmaceutical ingredients (APIs).

When reasoning:
- Apply rigorous clinical and mathematical thinking to optimize patient safety first, and prevent financial loss second.
- Provide concrete, actionable steps with specific timelines (e.g. Day 90 review, Day 60 supplier return memo, Day 30 front-of-shelf red clearance, Day 0 hazardous segregation).
- Format your response with clear headings, bullet points, and high-impact recommendations.`;

      const contents = `CONTEXT OF CURRENT PHARMACY STOCK & EXPIRING ITEMS:
${inventoryContext ? JSON.stringify(inventoryContext, null, 2) : 'No specific stock snapshot provided.'}

TASK / QUERY (${queryType || 'GENERAL_CONSULT'}):
${prompt}

Please analyze this thoroughly using high-level clinical reasoning and strategic inventory management principles.`;

      // Call gemini-3.1-pro-preview with ThinkingLevel.HIGH and no maxOutputTokens
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const responseText = response.text || 'No response generated.';

      return res.json({
        analysis: responseText,
        model: 'gemini-3.1-pro-preview',
        thinkingMode: 'HIGH',
      });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to complete clinical pharmacist reasoning.',
      });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'PharmAlert API',
      hasGemini: Boolean(apiKey),
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmAlert server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

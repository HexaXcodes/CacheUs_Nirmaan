// services/llmService.js
// Coaching/explanation layer for procedure steps. Strict guardrails: this
// service explains WHY a step matters and HOW to do it more clearly. It must
// never diagnose, prescribe, modify medication, calculate dosage, determine
// severity, or override the deterministic workflow engine.
const OpenAI = require('openai');
const crypto = require('crypto');
const { cache } = require('./cache');

const hasKey =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY.startsWith('sk-') &&
  process.env.OPENAI_API_KEY.length > 20;

const openai = hasKey
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15 * 1000,
      maxRetries: 0
    })
  : null;

const cacheKey = (obj) =>
  'llm:' + crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callWithRetry(prompt, maxAttempts = 2) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });
      return JSON.parse(resp.choices[0].message.content);
    } catch (err) {
      lastErr = err;
      if (err.status === 401 || err.status === 403) throw err;
      if (i < maxAttempts - 1) {
        const wait = 500 * Math.pow(2, i);
        console.warn(`[LLM] Attempt ${i + 1} failed (${err.message}). Retrying in ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

const GUARDRAILS = `You are NovaCare's coaching assistant. NovaCare is a procedure-technique
guidance and medication-delivery assistance platform — it is NOT a doctor, NOT a diagnostic
system, and NOT a prescriber. You MUST NOT diagnose any condition, prescribe or suggest any
medication, change or calculate any dose (including insulin), judge medical severity, or
contradict the deterministic step already given by the app. Only explain the technique step
that is provided to you, in the requested language, in plain, voice-friendly language suitable
for reading aloud or displaying in AR.`;

/**
 * Explain a single procedure step (why it matters + how to do it well).
 */
async function explainStep({ workflow, step, language = 'en', userMedicalInfo }) {
  const key = cacheKey({ kind: 'step', workflowId: workflow.id, stepId: step.id, language, userMedicalInfo });
  const cached = cache.get(key);
  if (cached) return { ...cached, cached: true };

  if (!openai) {
    const fallback = buildFallback({ workflow, step, language });
    cache.set(key, fallback);
    return { ...fallback, fallback: true };
  }

  const baseInstruction = (step.instruction && (step.instruction[language] || step.instruction.en)) || step.title;
  const userContext = userMedicalInfo
    ? `Patient context (for tone/personalization only, not for medical decisions):
- Conditions: ${(userMedicalInfo.conditions || []).join(', ') || 'none stated'}
- Allergies: ${(userMedicalInfo.allergies || []).join(', ') || 'none stated'}`
    : 'No patient context provided.';

  const prompt = `${GUARDRAILS}

Workflow: ${workflow.name} (${workflow.category})
Current step: "${step.title}" — ${baseInstruction}
Language for response: ${language}

${userContext}

Respond in JSON ONLY (no markdown, no code fences) with this exact shape:
{
  "explanation": "1-3 sentence, voice-friendly explanation of why this step matters and how to do it correctly, in the requested language",
  "commonMistakes": ["short mistake 1", "short mistake 2"]
}`;

  try {
    const parsed = await callWithRetry(prompt);
    cache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.error('[LLM] All retries failed, using fallback:', err.message);
    const fallback = buildFallback({ workflow, step, language });
    cache.set(key, fallback, 300);
    return { ...fallback, fallback: true, error: err.message };
  }
}

/**
 * Explain the overall workflow (what it's for, at a glance).
 */
async function explainWorkflow({ workflow, language = 'en' }) {
  const key = cacheKey({ kind: 'workflow', workflowId: workflow.id, language });
  const cached = cache.get(key);
  if (cached) return { ...cached, cached: true };

  if (!openai) {
    const fallback = { explanation: workflow.description };
    cache.set(key, fallback);
    return { ...fallback, fallback: true };
  }

  const prompt = `${GUARDRAILS}

Workflow: ${workflow.name} (${workflow.category})
Description: ${workflow.description}
Language for response: ${language}

Respond in JSON ONLY:
{
  "explanation": "2-3 sentence, voice-friendly overview of what this workflow helps the user do, in the requested language"
}`;

  try {
    const parsed = await callWithRetry(prompt);
    cache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.error('[LLM] Workflow explain failed:', err.message);
    return { explanation: workflow.description, fallback: true };
  }
}

// ===== Fallback explanations (no API key needed) =====
function buildFallback({ workflow, step, language }) {
  const instruction = (step.instruction && (step.instruction[language] || step.instruction.en)) || '';
  return {
    explanation: instruction
      ? `${step.title}: ${instruction}`
      : `Follow this step carefully as part of ${workflow.name}.`,
    commonMistakes: []
  };
}

module.exports = { explainStep, explainWorkflow };

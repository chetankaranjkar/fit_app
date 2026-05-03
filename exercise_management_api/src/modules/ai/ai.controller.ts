import { Router } from 'express'
import OpenAI from 'openai'
import { z, ZodError } from 'zod'

const schema = z.object({
  goal: z.string().trim().min(2),
  experience: z.string().trim().min(2),
  days: z.number().int().min(1).max(7),
  duration: z.number().int().min(10).max(180),
  equipment: z.array(z.string()).default([]),
  injuries: z.string().trim().max(400).optional(),
})

function fallbackPlan(input: z.infer<typeof schema>) {
  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
  return Array.from({ length: input.days }).map((_, index) => ({
    day: dayNames[index],
    focus: index % 2 === 0 ? 'Strength' : 'Conditioning',
    exercises: [
      { name: 'Squat', sets: 4, reps: '6-10', rest: '90s' },
      { name: 'Bench Press', sets: 4, reps: '6-10', rest: '90s' },
      { name: 'Deadlift', sets: 3, reps: '5-8', rest: '120s' },
    ],
  }))
}

function tryParseJsonObject(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    // Try to extract first JSON object from markdown/text responses.
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    }
    return null
  }
}

function buildPrompt(input: z.infer<typeof schema>) {
  return `Generate a structured workout plan in JSON with:
day, exercises, sets, reps, rest.
Goal: ${input.goal}
Experience: ${input.experience}
Days/week: ${input.days}
Duration per session: ${input.duration} minutes
Equipment: ${input.equipment.join(', ') || 'None'}
Injuries: ${input.injuries ?? 'None'}

Return strict JSON with shape:
{ "plan": [{ "day": "Day 1", "focus": "string", "exercises": [{ "name":"string", "sets":number, "reps":"string", "rest":"string" }] }], "explanation":"string" }`
}

async function tryOpenAi(input: z.infer<typeof schema>) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const client = new OpenAI({ apiKey })
  const completion = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: buildPrompt(input),
  })
  const output = completion.output_text || ''
  const parsed = tryParseJsonObject(output)
  if (!parsed || !Array.isArray((parsed as { plan?: unknown }).plan)) return null
  return { source: 'openai', ...parsed }
}

async function tryHuggingFace(input: z.infer<typeof schema>) {
  const hfApiKey = process.env.HF_API_KEY
  if (!hfApiKey) return null
  const model = process.env.HF_MODEL ?? 'HuggingFaceH4/zephyr-7b-beta'
  const prompt = `${buildPrompt(input)}\nOnly return JSON.`
  const response = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 900,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) return null
  const data = (await response.json()) as unknown
  const text =
    Array.isArray(data) && data[0] && typeof data[0] === 'object' && 'generated_text' in data[0]
      ? String((data[0] as { generated_text?: unknown }).generated_text ?? '')
      : ''
  const parsed = tryParseJsonObject(text)
  if (!parsed || !Array.isArray((parsed as { plan?: unknown }).plan)) return null
  return { source: 'huggingface', ...parsed }
}

export function aiController() {
  const router = Router()

  router.post('/ai/generate-workout', async (req, res) => {
    try {
      const body = schema.parse(req.body)
      const provider = (process.env.AI_PROVIDER ?? 'auto').toLowerCase()

      const openaiAttempt = provider === 'auto' || provider === 'openai'
      const hfAttempt = provider === 'auto' || provider === 'huggingface'

      if (openaiAttempt) {
        try {
          const openaiData = await tryOpenAi(body)
          if (openaiData) {
            res.json({ success: true, data: openaiData })
            return
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[AI] OpenAI provider failed:', error instanceof Error ? error.message : error)
        }
      }

      if (hfAttempt) {
        try {
          const hfData = await tryHuggingFace(body)
          if (hfData) {
            res.json({ success: true, data: hfData })
            return
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[AI] HuggingFace provider failed:', error instanceof Error ? error.message : error)
        }
      }

      res.json({
        success: true,
        data: {
          source: 'fallback',
          explanation: 'AI providers unavailable; returned deterministic starter plan.',
          plan: fallbackPlan(body),
        },
      })
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() })
        return
      }
      const message = error instanceof Error ? error.message : 'Unknown AI error'
      // eslint-disable-next-line no-console
      console.error('[AI] generate-workout failed, returning fallback:', message)
      const input = schema.safeParse(req.body)
      res.json({
        success: true,
        data: {
          source: 'fallback',
          explanation: 'AI request failed; returned deterministic starter plan.',
          plan: fallbackPlan(
            input.success
              ? input.data
              : { goal: 'General Fitness', experience: 'Beginner', days: 3, duration: 45, equipment: [] },
          ),
        },
      })
    }
  })

  return router
}

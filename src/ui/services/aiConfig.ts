import Groq from 'groq-sdk';
import { GardenSchema, PlanSchema, type Garden, type Plan } from '@core/types';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GardenConfig {
  garden: Garden;
  plan: Plan;
}

const SYSTEM_PROMPT = `You are a garden planning AI assistant. You help users create garden plans based on their requirements.

When the user describes what they want to grow, generate a complete garden configuration with:
1. Garden dimensions and location
2. Planting plan with species and dates
3. Realistic spacing and conditions

Output ONLY valid JSON matching this structure:
{
  "garden": {
    "id": "string",
    "location": {"lat": number, "lon": number, "city": "string", "timezone": "string"},
    "grid": {"width_ft": number, "length_ft": number, "subcell_size_in": 3, "total_subcells": number},
    "subcells": [],
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  },
  "plan": {
    "id": "string",
    "garden_id": "string",
    "created_at": "ISO8601",
    "plantings": [{"subcell_id": "string", "species_id": "string", "planting_date": "YYYY-MM-DD"}]
  }
}

Available species IDs: corn_wapsie_valley, tomato_better_boy, potato_yukon_gold
Subcell IDs format: sub_{x_in}_{y_in}
Use 3-inch subcells. For a 10×10 ft garden, you have 40×40 subcells (1600 total).`;

export async function generateGardenConfig(
  messages: ChatMessage[]
): Promise<GardenConfig> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' }, // Double validation: GROQ enforces structure
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  // Parse JSON
  const rawConfig = JSON.parse(content);

  // Zod validation layer: validates correctness
  const garden = GardenSchema.parse(rawConfig.garden);
  const plan = PlanSchema.parse(rawConfig.plan);

  return { garden, plan };
}

export async function* streamChatResponse(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export function validateGardenConfig(config: unknown): GardenConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid config: must be an object');
  }

  const { garden, plan } = config as Record<string, unknown>;

  // Zod validation
  const validatedGarden = GardenSchema.parse(garden);
  const validatedPlan = PlanSchema.parse(plan);

  return {
    garden: validatedGarden,
    plan: validatedPlan,
  };
}

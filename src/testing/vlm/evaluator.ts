/**
 * VLM evaluator using GROQ Llama Vision
 */

import Groq from 'groq-sdk';
import fs from 'fs';
import {
  getSystemPrompt,
  getUserPrompt,
  validateEvaluationResult,
  type ScenarioContext,
  type EvaluationResult,
} from './prompts';
import { retryWithBackoff } from './retryWithBackoff';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export interface EvaluationInput {
  screenshotPath: string;
  context: ScenarioContext;
}

/**
 * Evaluate UI quality from a screenshot using GROQ Vision
 *
 * @param input - Screenshot path and scenario context
 * @returns Evaluation result with scores and reasons
 */
export async function evaluateScreenshot(
  input: EvaluationInput
): Promise<EvaluationResult> {
  // Read screenshot as base64
  const imageBuffer = fs.readFileSync(input.screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  // Call GROQ Vision API with retry
  const response = await retryWithBackoff(
    async () => {
      return await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: getUserPrompt(input.context),
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3, // Low temperature for consistent evaluations
        max_tokens: 1024,
        response_format: { type: 'json_object' }, // Enforce JSON output
      });
    },
    {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      onRetry: (error, attempt, delayMs) => {
        console.error(
          `VLM API call failed (attempt ${attempt}), retrying in ${delayMs}ms:`,
          error.message
        );
      },
    }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from VLM');
  }

  // Parse JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse VLM response as JSON: ${content}`);
  }

  // Validate structure
  if (!validateEvaluationResult(parsed)) {
    throw new Error(`Invalid evaluation result structure: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

/**
 * Evaluate multiple screenshots and aggregate results
 */
export async function evaluateMultiple(
  inputs: EvaluationInput[]
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const input of inputs) {
    console.log(`Evaluating: ${input.context.name}...`);
    const result = await evaluateScreenshot(input);
    results.push(result);
    console.log(`  Overall score: ${result.overall_score}/100`);
  }

  return results;
}

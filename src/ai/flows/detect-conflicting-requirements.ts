'use server';

/**
 * @fileOverview Detects conflicting requirements within the source materials.
 *
 * - detectConflictingRequirements - A function that detects conflicting requirements.
 * - DetectConflictingRequirementsInput - The input type for the detectConflictingRequirements function.
 * - DetectConflictingRequirementsOutput - The return type for the detectConflictingRequirements function.
 */

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'genkit';

const MaterialSchema = z.object({
  id: z.string().describe("The unique identifier for the source material."),
  content: z.string().describe("The content of the source material."),
});

const DetectConflictingRequirementsInputSchema = z.object({
  sourceMaterials: z.array(MaterialSchema).describe('An array of source materials, each with an ID and content.'),
});
export type DetectConflictingRequirementsInput = z.infer<typeof DetectConflictingRequirementsInputSchema>;

const ConflictSchema = z.object({
  category: z.string().describe('The category of the conflict (e.g., Timeline, Scope, Budget).'),
  statement_a: z.string().describe('The first conflicting statement, as a direct quote from the source.'),
  statement_b: z.string().describe('The second conflicting statement, as a direct quote from the source.'),
  source_a: z.string().describe('The ID of the source material for statement_a.'),
  source_b: z.string().describe('The ID of the source material for statement_b.'),
});
export type Conflict = z.infer<typeof ConflictSchema>;

const DetectConflictingRequirementsOutputSchema = z.object({
  conflicts: z.array(ConflictSchema).describe('A list of detected conflicts.'),
});
export type DetectConflictingRequirementsOutput = z.infer<typeof DetectConflictingRequirementsOutputSchema>;

export async function detectConflictingRequirements(
  input: DetectConflictingRequirementsInput
): Promise<DetectConflictingRequirementsOutput> {
  return detectConflictingRequirementsFlow(input);
}

const detectConflictingRequirementsPrompt = ai.definePrompt({
  name: 'detectConflictingRequirementsPrompt',
  model: GEMINI_MODEL,
  input: { schema: DetectConflictingRequirementsInputSchema },
  output: { schema: DetectConflictingRequirementsOutputSchema },
  prompt: `You are given source materials to analyze for conflicts.

TASK:
Identify conflicts or contradictions where:
- Different sources specify incompatible requirements
- Requirements disagree on technology, scope, timeline, platform, or constraints
- Statements cannot all be true at the same time

For each conflict:
- Identify the category (e.g., Timeline, Scope, Technology, Platform, Budget, Constraints)
- Provide statement_a: first conflicting statement as a direct quote
- Provide statement_b: second conflicting statement as a direct quote
- Provide source_a: ID of source for statement_a
- Provide source_b: ID of source for statement_b

RULES:
- Do NOT suggest resolutions
- Do NOT judge correctness
- If no conflicts exist, return an empty array for 'conflicts'
- Only report clear, direct contradictions
- Do NOT hallucinate information

OUTPUT FORMAT (STRICT):
{
  "conflicts": [
    {
      "category": "...",
      "statement_a": "...",
      "statement_b": "...",
      "source_a": "...",
      "source_b": "..."
    }
  ]
}

Source Materials:
{{#each sourceMaterials}}
[ID: {{this.id}}]
{{{this.content}}}
---
{{/each}}`,
});

const detectConflictingRequirementsFlow = ai.defineFlow(
  {
    name: 'detectConflictingRequirementsFlow',
    inputSchema: DetectConflictingRequirementsInputSchema,
    outputSchema: DetectConflictingRequirementsOutputSchema,
  },
  async input => {
    console.log("Executing detectConflictingRequirementsFlow...");
    try {
      const response = await detectConflictingRequirementsPrompt(input);
      if (!response || !response.output) {
        console.error("AI returned empty response (conflicts):", response);
        throw new Error("AI returned empty response during conflict detection.");
      }
      return response.output;
    } catch (err: any) {
      console.error("Error in detectConflictingRequirementsPrompt execution:", err.message, err.stack);
      throw err;
    }
  }
);

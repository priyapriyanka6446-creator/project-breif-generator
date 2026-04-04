'use server';

/**
 * @fileOverview Generates a structured project brief from ingested materials.
 *
 * - generateProjectBrief - A function that generates a project brief.
 * - GenerateProjectBriefInput - The input type for the generateProjectBrief function.
 * - GenerateProjectBriefOutput - The return type for the generateProjectBrief function.
 */

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'genkit';

const MaterialSchema = z.object({
  id: z.string().describe('The unique identifier for the source material.'),
  content: z.string().describe('The content of the source material.'),
});

const GenerateProjectBriefInputSchema = z.object({
  materials: z.array(MaterialSchema).describe('An array of source materials, each with an ID and content.'),
});
export type GenerateProjectBriefInput = z.infer<typeof GenerateProjectBriefInputSchema>;

const BriefItemSchema = z.object({
  text: z.string().describe('The content of the item.'),
  references: z
    .array(z.string())
    .describe('A list of source material IDs that support this item.'),
});

const GenerateProjectBriefOutputSchema = z.object({
  project_overview: z.array(BriefItemSchema),
  goals: z.array(BriefItemSchema),
  in_scope: z.array(BriefItemSchema),
  out_of_scope: z.array(BriefItemSchema),
  constraints: z.array(BriefItemSchema),
  assumptions: z.array(BriefItemSchema),
  risks: z.array(BriefItemSchema),
  acceptance_criteria: z.array(BriefItemSchema),
  open_questions: z.array(BriefItemSchema),
});
export type GenerateProjectBriefOutput = z.infer<typeof GenerateProjectBriefOutputSchema>;

export async function generateProjectBrief(input: GenerateProjectBriefInput): Promise<GenerateProjectBriefOutput> {
  return generateProjectBriefFlow(input);
}

const projectBriefPrompt = ai.definePrompt({
  name: 'projectBriefPrompt',
  model: GEMINI_MODEL,
  input: { schema: GenerateProjectBriefInputSchema },
  output: { schema: GenerateProjectBriefOutputSchema },
  prompt: `You are given multiple project-related inputs such as notes, chat messages, or document snippets.

Each input is formatted as:
[ID: <id>]
<content>
---

TASK:
Extract the following sections based ONLY on what is explicitly mentioned:
1. project_overview
2. goals
3. in_scope
4. out_of_scope
5. constraints
6. assumptions
7. risks
8. acceptance_criteria
9. open_questions

RULES:
- Each item must include:
  - "text": the requirement in neutral wording
  - "references": array of source material IDs (from the [ID: ...] markers)
- If the same requirement appears multiple times, list it once with multiple source IDs in "references".
- Do NOT resolve conflicts.
- Do NOT rewrite intent.
- Do NOT guess missing requirements.
- If information for a section is missing, provide an empty array for that section.

OUTPUT FORMAT (STRICT):
Return a JSON object with the sections as arrays of objects, each containing "text" and "references" fields.

Materials:
{{#each materials}}
[ID: {{this.id}}]
{{{this.content}}}
---
{{/each}}`,
});

const generateProjectBriefFlow = ai.defineFlow(
  {
    name: 'generateProjectBriefFlow',
    inputSchema: GenerateProjectBriefInputSchema,
    outputSchema: GenerateProjectBriefOutputSchema,
  },
  async input => {
    console.log("Executing generateProjectBriefFlow...");
    try {
      const response = await projectBriefPrompt(input);
      console.log("AI Response received:", !!response, !!response?.output);

      if (!response || !response.output) {
        console.error("AI returned empty response:", response);
        throw new Error("AI returned empty response. This may be due to safety filters or model availability.");
      }
      return response.output;
    } catch (err: any) {
      console.error("Error in projectBriefPrompt execution:", err.message);
      throw err;
    }
  }
);

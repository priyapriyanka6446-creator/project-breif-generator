'use server';

/**
 * @fileOverview Resolves detected conflicts with human-selected resolutions.
 *
 * - resolveConflicts - A function that records conflict resolutions.
 * - ResolveConflictsInput - The input type for the resolveConflicts function.
 * - ResolveConflictsOutput - The return type for the resolveConflicts function.
 */

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'genkit';

const ConflictSchema = z.object({
    category: z.string().describe('The category of the conflict.'),
    statement_a: z.string().describe('The first conflicting statement.'),
    statement_b: z.string().describe('The second conflicting statement.'),
    source_a: z.string().describe('The ID of the source for statement_a.'),
    source_b: z.string().describe('The ID of the source for statement_b.'),
});

const ConflictResolutionSchema = z.object({
    conflict: ConflictSchema.describe('The original conflict.'),
    chosen_resolution: z.string().describe('The human-selected resolution for this conflict.'),
});

const ResolveConflictsInputSchema = z.object({
    resolutions: z.array(ConflictResolutionSchema).describe('An array of conflicts with their human-selected resolutions.'),
});
export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;

const ResolvedConflictSchema = z.object({
    conflict_summary: z.string().describe('Brief restatement of the conflict.'),
    chosen_resolution: z.string().describe('The resolution that was chosen.'),
    rejected_options: z.array(z.string()).describe('The options that were not chosen.'),
    status: z.string().describe('Resolution status (e.g., "resolved").'),
});

const ResolveConflictsOutputSchema = z.object({
    resolved_conflicts: z.array(ResolvedConflictSchema).describe('A list of resolved conflicts with details.'),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;

export async function resolveConflicts(
    input: ResolveConflictsInput
): Promise<ResolveConflictsOutput> {
    return resolveConflictsFlow(input);
}

const resolveConflictsPrompt = ai.definePrompt({
    name: 'resolveConflictsPrompt',
    model: GEMINI_MODEL,
    input: { schema: ResolveConflictsInputSchema },
    output: { schema: ResolveConflictsOutputSchema },
    prompt: `You are given:
1. A list of detected conflicts
2. A human-selected resolution for each conflict

TASK:
For each conflict:
- Restate the conflict briefly in "conflict_summary"
- Record the chosen resolution in "chosen_resolution"
- Preserve rejected options in "rejected_options" (the statements that were NOT chosen)
- Mark resolution status as "resolved" in "status"

Do NOT add opinions or recommendations.

OUTPUT FORMAT (STRICT):
{
  "resolved_conflicts": [
    {
      "conflict_summary": "...",
      "chosen_resolution": "...",
      "rejected_options": ["...", "..."],
      "status": "resolved"
    }
  ]
}

Conflicts with Resolutions:
{{#each resolutions}}
Conflict:
- Category: {{this.conflict.category}}
- Statement A: "{{this.conflict.statement_a}}" (Source: {{this.conflict.source_a}})
- Statement B: "{{this.conflict.statement_b}}" (Source: {{this.conflict.source_b}})
- Chosen Resolution: {{this.chosen_resolution}}
---
{{/each}}`,
});

const resolveConflictsFlow = ai.defineFlow(
    {
        name: 'resolveConflictsFlow',
        inputSchema: ResolveConflictsInputSchema,
        outputSchema: ResolveConflictsOutputSchema,
    },
    async input => {
        const { output } = await resolveConflictsPrompt(input);
        return output!;
    }
);

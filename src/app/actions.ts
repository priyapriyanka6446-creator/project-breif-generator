import { generateProjectBrief, GenerateProjectBriefInput, GenerateProjectBriefOutput } from '@/ai/flows/generate-project-brief';
import { detectConflictingRequirements, DetectConflictingRequirementsInput, DetectConflictingRequirementsOutput } from '@/ai/flows/detect-conflicting-requirements';
import * as fs from 'fs';
import * as path from 'path';

export interface SourceMaterial {
  id: string;
  title: string;
  content: string;
}

export async function generateBriefAndFindConflicts(sources: SourceMaterial[]): Promise<{
  brief: GenerateProjectBriefOutput | null;
  conflicts: DetectConflictingRequirementsOutput['conflicts'] | null;
  error: string | null;
}> {
  try {
    if (sources.length === 0) {
      return {
        brief: null,
        conflicts: null,
        error: "No source materials provided."
      }
    }

    console.log("Starting generateBriefAndFindConflicts with sources:", sources.length);
    const materialsForFlow = sources.map(s => ({ id: s.id, content: s.content }));

    const generateBriefInput: GenerateProjectBriefInput = {
      materials: materialsForFlow,
    };
    const detectConflictsInput: DetectConflictingRequirementsInput = {
      sourceMaterials: materialsForFlow,
    };


    // Helper function for retrying operations with backoff
    const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        if (retries === 0 || !error.message?.includes('429')) {
          console.error("AI Flow failed with non-retryable error:", error.message, error.stack);
          throw error;
        }
        console.log(`Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
      }
    };

    console.log("Calling AI flows...");
    const [briefResult, conflictsResult] = await Promise.allSettled([
      retryWithBackoff(() => generateProjectBrief(generateBriefInput)),
      retryWithBackoff(() => detectConflictingRequirements(detectConflictsInput)),
    ]);
    console.log("AI flows finished. Brief status:", briefResult.status, "Conflicts status:", conflictsResult.status);

    // Check brief result
    let brief = null;
    if (briefResult.status === 'fulfilled') {
      brief = briefResult.value;
    } else {
      // If brief failed, we consider it a hard failure
      throw briefResult.reason;
    }

    // Check conflicts result - if it fails, we just log it and proceed with the brief
    let conflicts = null;
    if (conflictsResult.status === 'fulfilled') {
      conflicts = conflictsResult.value.conflicts;
    } else {
      console.warn("Conflict detection failed, proceeding with brief only:", conflictsResult.reason);
    }

    return {
      brief,
      conflicts,
      error: null,
    };
  } catch (error: any) {
    console.error("Error in generateBriefAndFindConflicts:", error);
    return {
      brief: null,
      conflicts: null,
      error: error.message?.includes('429')
        ? "AI service is currently busy (Rate Limit). Please waiting a minute and try again."
        : `Generation failed: ${error.message || "An unexpected error occurred."}`,
    };
  }
}

import { resolveConflicts, ResolveConflictsInput, ResolveConflictsOutput } from '@/ai/flows/resolve-conflicts';

export interface ConflictResolution {
  conflict: DetectConflictingRequirementsOutput['conflicts'][0];
  chosenResolution: string;
}

export async function resolveProjectConflicts(resolutions: ConflictResolution[]): Promise<{
  resolvedConflicts: ResolveConflictsOutput['resolved_conflicts'] | null;
  error: string | null;
}> {
  try {
    if (resolutions.length === 0) {
      return {
        resolvedConflicts: null,
        error: "No conflict resolutions provided."
      }
    }

    const input: ResolveConflictsInput = {
      resolutions: resolutions.map(r => ({
        conflict: r.conflict,
        chosen_resolution: r.chosenResolution
      }))
    };

    const result = await resolveConflicts(input);

    return {
      resolvedConflicts: result.resolved_conflicts,
      error: null,
    };
  } catch (error: any) {
    console.error("Error in resolveProjectConflicts:", error);
    return {
      resolvedConflicts: null,
      error: error.message?.includes('429')
        ? "AI service is currently busy (Rate Limit). Please wait a minute and try again."
        : "An unexpected error occurred while resolving conflicts. Please try again.",
    };
  }
}

/**
 * Safe Text Replacement & Correction Engine
 * Handles character-accurate replacements in descending order, detects overlaps,
 * and maintains editorial integrity.
 */

import { Issue, TextCorrectionDiff } from '@/types/proofreading';
import { normalizeBengali } from '../dictionary/normalize';
import * as Diff from 'diff';

export interface ReplacementResult {
  updatedText: string;
  appliedCount: number;
  conflictsCount: number;
  appliedIssueIds: string[];
  skippedIssueIds: string[];
  messages: string[];
}

/**
 * Applies a list of replacements safely to the original text.
 * Sorts in descending order of offsets to preserve character positions.
 * Rejects overlapping ranges.
 */
export function applySafeReplacements(
  text: string,
  issuesToApply: Issue[]
): ReplacementResult {
  const normalizedText = normalizeBengali(text);
  const result: ReplacementResult = {
    updatedText: normalizedText,
    appliedCount: 0,
    conflictsCount: 0,
    appliedIssueIds: [],
    skippedIssueIds: [],
    messages: [],
  };

  const validCandidates: (Issue & { startOffset: number; endOffset: number })[] = [];

  for (const issue of issuesToApply) {
    const normTarget = normalizeBengali(issue.originalText.trim());
    if (!normTarget) continue;

    let resolvedStart = issue.startOffset;
    let resolvedEnd = issue.endOffset;

    if (
      resolvedStart === null ||
      resolvedEnd === null ||
      resolvedStart === undefined ||
      resolvedEnd === undefined ||
      resolvedStart < 0 ||
      resolvedEnd <= resolvedStart
    ) {
      // Offset not provided - check if unique occurrence exists in text
      const firstIdx = normalizedText.indexOf(normTarget);
      const lastIdx = normalizedText.lastIndexOf(normTarget);
      if (firstIdx !== -1 && firstIdx === lastIdx) {
        resolvedStart = firstIdx;
        resolvedEnd = firstIdx + normTarget.length;
      } else {
        result.skippedIssueIds.push(issue.id);
        result.messages.push(`বাদ দেওয়া হয়েছে: "${issue.originalText}" - সঠিক অবস্থান নিশ্চিত নয়।`);
        continue;
      }
    }

    // Verify text matches what is at the offset or nearby
    let actualSubstr = normalizedText.slice(resolvedStart, resolvedEnd);
    if (actualSubstr !== normTarget) {
      // Check nearby offsets (±5 chars)
      let foundNearby = false;
      for (let delta = -5; delta <= 5; delta++) {
        const testStart = resolvedStart + delta;
        const testEnd = testStart + normTarget.length;
        if (testStart >= 0 && testEnd <= normalizedText.length) {
          if (normalizedText.slice(testStart, testEnd) === normTarget) {
            resolvedStart = testStart;
            resolvedEnd = testEnd;
            actualSubstr = normTarget;
            foundNearby = true;
            break;
          }
        }
      }

      if (!foundNearby) {
        // Check if there is an unambiguous unique occurrence
        const firstIdx = normalizedText.indexOf(normTarget);
        const lastIdx = normalizedText.lastIndexOf(normTarget);
        if (firstIdx !== -1 && firstIdx === lastIdx) {
          resolvedStart = firstIdx;
          resolvedEnd = firstIdx + normTarget.length;
          actualSubstr = normTarget;
        } else {
          result.skippedIssueIds.push(issue.id);
          result.messages.push(
            `বাদ দেওয়া হয়েছে: অবস্থান (${resolvedStart}-${resolvedEnd}) এ "${normTarget}" পাওয়া যায়নি।`
          );
          continue;
        }
      }
    }

    validCandidates.push({
      ...issue,
      originalText: normTarget,
      suggestedReplacement: normalizeBengali(issue.suggestedReplacement || ''),
      startOffset: resolvedStart,
      endOffset: resolvedEnd,
    });
  }

  // Detect overlapping ranges by sorting ascending first
  validCandidates.sort((a, b) => a.startOffset - b.startOffset);

  const nonOverlapping: (Issue & { startOffset: number; endOffset: number })[] = [];
  let lastEnd = -1;

  for (const candidate of validCandidates) {
    if (candidate.startOffset < lastEnd) {
      // Overlap detected!
      result.conflictsCount++;
      result.skippedIssueIds.push(candidate.id);
      result.messages.push(
        `দ্বন্দ্ব (Overlap) সনাক্ত হয়েছে: "${candidate.originalText}" এর পরিসর পূর্ববর্তী সংশোধনের সাথে মিলে যায়।`
      );
    } else {
      nonOverlapping.push(candidate);
      lastEnd = candidate.endOffset;
    }
  }

  // Sort descending by startOffset so we modify the text from back to front
  nonOverlapping.sort((a, b) => b.startOffset - a.startOffset);

  let modifiedText = normalizedText;
  for (const item of nonOverlapping) {
    const before = modifiedText.slice(0, item.startOffset);
    const after = modifiedText.slice(item.endOffset);
    modifiedText = before + item.suggestedReplacement + after;

    result.appliedCount++;
    result.appliedIssueIds.push(item.id);
  }

  result.updatedText = modifiedText;
  return result;
}

/**
 * Recomputes offsets for remaining pending issues after an update has taken place.
 */
export function recomputeRemainingOffsets(
  newText: string,
  remainingIssues: Issue[]
): Issue[] {
  const normNewText = normalizeBengali(newText);

  return remainingIssues.map((issue) => {
    const searchTarget = normalizeBengali(issue.originalText);
    const occurrences: number[] = [];
    let idx = normNewText.indexOf(searchTarget);

    while (idx !== -1) {
      occurrences.push(idx);
      idx = normNewText.indexOf(searchTarget, idx + 1);
    }

    if (occurrences.length === 0) {
      return {
        ...issue,
        startOffset: null,
        endOffset: null,
      };
    }

    if (occurrences.length === 1) {
      const start = occurrences[0];
      return {
        ...issue,
        startOffset: start,
        endOffset: start + searchTarget.length,
      };
    }

    // Multiple occurrences: find closest to old startOffset
    const oldOffset = issue.startOffset ?? 0;
    const closest = occurrences.reduce((prev, curr) =>
      Math.abs(curr - oldOffset) < Math.abs(prev - oldOffset) ? curr : prev
    );

    if (Math.abs(closest - oldOffset) < 150) {
      return {
        ...issue,
        startOffset: closest,
        endOffset: closest + searchTarget.length,
      };
    }

    return {
      ...issue,
      startOffset: null,
      endOffset: null,
    };
  });
}

/**
 * Computes a visual diff between original and corrected Bengali text for editorial side-by-side review.
 */
export function computeEditorialDiff(
  original: string,
  corrected: string
): TextCorrectionDiff[] {
  const changes = Diff.diffWordsWithSpace(normalizeBengali(original), normalizeBengali(corrected));

  return changes.map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value,
  }));
}

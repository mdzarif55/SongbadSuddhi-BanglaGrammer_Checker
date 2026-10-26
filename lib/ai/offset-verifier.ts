/**
 * Server-Side Offset Verification Engine
 * Strictly verifies and aligns AI-suggested issues against actual article text.
 * Prevents false highlighting, protects against misalignment, and avoids misreplacements.
 */

import { Issue, IssueCategory, IssueSeverity } from '@/types/proofreading';
import { normalizeBengali } from '../dictionary/normalize';

export interface RawAiIssue {
  id?: string;
  originalText: string;
  suggestedReplacement: string;
  category: string;
  explanation: string;
  severity?: string;
  confidence?: number;
  startOffset?: number | null;
  endOffset?: number | null;
  requiresHumanReview?: boolean;
  contextSentence?: string;
}

const VALID_CATEGORIES: Set<IssueCategory> = new Set([
  'spelling',
  'grammar',
  'punctuation',
  'style',
  'clarity',
  'editorial_warning',
]);

const VALID_SEVERITIES: Set<IssueSeverity> = new Set(['low', 'medium', 'high']);

/**
 * Checks whether a given character position falls inside quotation marks.
 */
function isInsideQuotes(text: string, pos: number): boolean {
  const beforeText = text.slice(0, pos);
  const afterText = text.slice(pos);

  // Check double quotes
  const doubleQuotesBefore = (beforeText.match(/["“]/g) || []).length;
  const doubleQuotesAfter = (afterText.match(/["”]/g) || []).length;
  if (doubleQuotesBefore % 2 === 1 && doubleQuotesAfter > 0) return true;

  // Check single quotes
  const singleQuotesBefore = (beforeText.match(/['‘]/g) || []).length;
  const singleQuotesAfter = (afterText.match(/['’]/g) || []).length;
  if (singleQuotesBefore % 2 === 1 && singleQuotesAfter > 0) return true;

  // Immediate quote boundary within window
  const windowBefore = text.slice(Math.max(0, pos - 30), pos);
  const windowAfter = text.slice(pos, Math.min(text.length, pos + 30));
  if (/["'“”‘’]/.test(windowBefore) && /["'“”‘’]/.test(windowAfter)) return true;

  return false;
}

/**
 * Validates, locates, and aligns raw issues against the source article.
 */
export function verifyAndAlignAiIssues(
  sourceText: string,
  rawIssues: RawAiIssue[]
): Issue[] {
  const normSource = normalizeBengali(sourceText);
  const verifiedIssues: Issue[] = [];
  let idCounter = 0;

  for (const raw of rawIssues) {
    if (!raw.originalText || typeof raw.originalText !== 'string') continue;

    const target = normalizeBengali(raw.originalText.trim());
    if (!target) continue;

    // Validate category
    let category: IssueCategory = 'spelling';
    if (VALID_CATEGORIES.has(raw.category as IssueCategory)) {
      category = raw.category as IssueCategory;
    } else if (raw.category?.includes('spell')) {
      category = 'spelling';
    } else if (raw.category?.includes('gramm')) {
      category = 'grammar';
    } else if (raw.category?.includes('punct')) {
      category = 'punctuation';
    } else if (raw.category?.includes('warn') || raw.category?.includes('editor')) {
      category = 'editorial_warning';
    } else if (raw.category?.includes('clar')) {
      category = 'clarity';
    } else {
      category = 'style';
    }

    // Validate severity
    let severity: IssueSeverity = 'medium';
    if (VALID_SEVERITIES.has(raw.severity as IssueSeverity)) {
      severity = raw.severity as IssueSeverity;
    } else if (category === 'editorial_warning' || category === 'grammar') {
      severity = 'high';
    }

    // Attempt to verify offset
    let start: number | null = null;
    let end: number | null = null;

    if (
      typeof raw.startOffset === 'number' &&
      typeof raw.endOffset === 'number' &&
      raw.startOffset >= 0 &&
      raw.endOffset > raw.startOffset &&
      raw.endOffset <= normSource.length
    ) {
      const slice = normSource.slice(raw.startOffset, raw.endOffset);
      if (slice === target) {
        start = raw.startOffset;
        end = raw.endOffset;
      }
    }

    // If initial offset didn't match, search for the target
    if (start === null) {
      const occurrences: number[] = [];
      let idx = normSource.indexOf(target);

      while (idx !== -1) {
        occurrences.push(idx);
        idx = normSource.indexOf(target, idx + 1);
      }

      if (occurrences.length === 1) {
        // Deterministic single occurrence
        start = occurrences[0];
        end = start + target.length;
      } else if (occurrences.length > 1) {
        // If contextSentence was provided, try matching inside the context
        if (raw.contextSentence) {
          const normContext = normalizeBengali(raw.contextSentence);
          const contextPos = normSource.indexOf(normContext);
          if (contextPos !== -1) {
            const posInContext = normContext.indexOf(target);
            if (posInContext !== -1) {
              start = contextPos + posInContext;
              end = start + target.length;
            }
          }
        }
      }
    }

    // Check if the issue touches protected quotes
    const touchesQuotes = start !== null && isInsideQuotes(normSource, start);

    const requiresHumanReview =
      raw.requiresHumanReview === true ||
      category === 'editorial_warning' ||
      touchesQuotes;

    verifiedIssues.push({
      id: raw.id || `ai-issue-${++idCounter}`,
      originalText: target,
      suggestedReplacement: normalizeBengali(raw.suggestedReplacement || ''),
      category,
      explanation: raw.explanation || 'সম্পাদকীয় সংশোধন প্রস্তাবনা।',
      severity,
      confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0.85)),
      startOffset: start,
      endOffset: end,
      requiresHumanReview,
      source: 'ai',
      contextSentence: raw.contextSentence,
    });
  }

  return verifiedIssues;
}

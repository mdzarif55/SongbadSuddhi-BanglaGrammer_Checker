import { describe, it, expect } from 'vitest';
import {
  applySafeReplacements,
  recomputeRemainingOffsets,
  computeEditorialDiff,
} from '@/lib/correction/apply-corrections';
import { Issue } from '@/types/proofreading';
import { normalizeBengali } from '@/lib/dictionary/normalize';

describe('Safe Text Replacement Engine', () => {
  it('applies verified single replacement without altering surrounding text', () => {
    const original = normalizeBengali('বৈঠকে নতুন প্রকল্পের রূপরেখা তৈরী করা হয়েছে।');
    const start = original.indexOf('তৈরী');
    const issues: Issue[] = [
      {
        id: 'issue-1',
        originalText: 'তৈরী',
        suggestedReplacement: 'তৈরি',
        category: 'spelling',
        explanation: 'অতৎসম শব্দে হ্রস্ব ই-কার হবে।',
        severity: 'medium',
        confidence: 0.95,
        startOffset: start,
        endOffset: start + 'তৈরী'.length,
        requiresHumanReview: false,
        source: 'dictionary',
      },
    ];

    const result = applySafeReplacements(original, issues);
    expect(result.appliedCount).toBe(1);
    expect(result.updatedText).toBe(normalizeBengali('বৈঠকে নতুন প্রকল্পের রূপরেখা তৈরি করা হয়েছে।'));
  });

  it('safely applies multiple replacements in descending offset order', () => {
    const original = normalizeBengali('সরকারী কর্মকর্তাদের জন্য পুরষ্কার ঘোষণা করা হয়েছে।');
    const sorkariStart = original.indexOf('সরকারী');
    const puroshkarStart = original.indexOf('পুরষ্কার');

    const issues: Issue[] = [
      {
        id: 'issue-sorkari',
        originalText: 'সরকারী',
        suggestedReplacement: 'সরকারি',
        category: 'spelling',
        explanation: 'হ্রস্ব ই-কার',
        severity: 'high',
        confidence: 0.95,
        startOffset: sorkariStart,
        endOffset: sorkariStart + 'সরকারী'.length,
        requiresHumanReview: false,
        source: 'dictionary',
      },
      {
        id: 'issue-puroshkar',
        originalText: 'পুরষ্কার',
        suggestedReplacement: 'পুরস্কার',
        category: 'spelling',
        explanation: 'দন্ত্য স',
        severity: 'high',
        confidence: 0.95,
        startOffset: puroshkarStart,
        endOffset: puroshkarStart + 'পুরষ্কার'.length,
        requiresHumanReview: false,
        source: 'dictionary',
      },
    ];

    const result = applySafeReplacements(original, issues);
    expect(result.appliedCount).toBe(2);
    expect(result.updatedText).toBe(normalizeBengali('সরকারি কর্মকর্তাদের জন্য পুরস্কার ঘোষণা করা হয়েছে।'));
  });

  it('detects and avoids overlapping range replacements', () => {
    const original = normalizeBengali('ঢাকা বিশ্ববিদ্যালয় প্রশাসন');
    const issues: Issue[] = [
      {
        id: 'issue-1',
        originalText: 'ঢাকা বিশ্ববিদ্যালয়',
        suggestedReplacement: 'ঢাকা ভার্সিটি',
        category: 'style',
        explanation: '',
        severity: 'low',
        confidence: 0.9,
        startOffset: 0,
        endOffset: 19,
        requiresHumanReview: false,
        source: 'ai',
      },
      {
        id: 'issue-2',
        originalText: 'বিশ্ববিদ্যালয়',
        suggestedReplacement: 'বিশ্ববিদ্যালয়টি',
        category: 'grammar',
        explanation: '',
        severity: 'low',
        confidence: 0.9,
        startOffset: 5,
        endOffset: 18,
        requiresHumanReview: false,
        source: 'ai',
      },
    ];

    const result = applySafeReplacements(original, issues);
    expect(result.conflictsCount).toBe(1);
    expect(result.appliedCount).toBe(1);
  });

  it('correctly handles repeated identical words in different locations', () => {
    const original = normalizeBengali('তিনি তৈরি করলেন এবং তিনি বললেন যে এটি ভালো।');
    const secondTiniStart = original.indexOf('তিনি বললেন');

    const issues: Issue[] = [
      {
        id: 'issue-second-tini',
        originalText: 'তিনি',
        suggestedReplacement: 'মন্ত্রী',
        category: 'clarity',
        explanation: 'স্পষ্টতার জন্য পদবি উল্লেখ',
        severity: 'low',
        confidence: 0.8,
        startOffset: secondTiniStart,
        endOffset: secondTiniStart + 'তিনি'.length,
        requiresHumanReview: false,
        source: 'ai',
      },
    ];

    const result = applySafeReplacements(original, issues);
    expect(result.appliedCount).toBe(1);
    expect(result.updatedText).toBe(normalizeBengali('তিনি তৈরি করলেন এবং মন্ত্রী বললেন যে এটি ভালো।'));
  });

  it('recomputes remaining offsets accurately after prior replacement', () => {
    const initialText = normalizeBengali('সরকারী প্রতিবেদন অনুযায়ী ইতিমধ্যে কাজ শুরু হয়েছে।');
    const itimodhyeStart = initialText.indexOf('ইতিমধ্যে');

    const remainingIssue: Issue = {
      id: 'issue-itimodhye',
      originalText: 'ইতিমধ্যে',
      suggestedReplacement: 'ইতোমধ্যে',
      category: 'spelling',
      explanation: 'সন্ধিজাত রূপ',
      severity: 'medium',
      confidence: 0.9,
      startOffset: itimodhyeStart,
      endOffset: itimodhyeStart + 'ইতিমধ্যে'.length,
      requiresHumanReview: false,
      source: 'dictionary',
    };

    const newText = normalizeBengali('সরকারি প্রতিবেদন অনুযায়ী ইতিমধ্যে কাজ শুরু হয়েছে।');
    const aligned = recomputeRemainingOffsets(newText, [remainingIssue]);
    expect(aligned[0].startOffset).not.toBeNull();
    expect(newText.slice(aligned[0].startOffset!, aligned[0].endOffset!)).toBe('ইতিমধ্যে');
  });

  it('computes correct visual diff chunks', () => {
    const orig = 'তিনি তৈরী করেছেন।';
    const corr = 'তিনি তৈরি করেছেন।';
    const diff = computeEditorialDiff(orig, corr);

    const hasRemoved = diff.some((d) => d.type === 'removed');
    const hasAdded = diff.some((d) => d.type === 'added');

    expect(hasRemoved).toBe(true);
    expect(hasAdded).toBe(true);
  });
});


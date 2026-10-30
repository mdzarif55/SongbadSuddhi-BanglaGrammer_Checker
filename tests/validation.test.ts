import { describe, it, expect } from 'vitest';
import {
  CheckArticleRequestSchema,
  CorrectArticleRequestSchema,
  AiAnalysisResponseSchema,
} from '@/lib/validation/check-schema';
import { verifyAndAlignAiIssues } from '@/lib/ai/offset-verifier';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { normalizeBengali } from '@/lib/dictionary/normalize';

describe('Validation Schemas', () => {
  it('validates a correct article check request', () => {
    const valid = {
      title: 'নতুন জাতীয় বাজেট ঘোষণা',
      content: 'অর্থমন্ত্রী আজ সংসদে নতুন বাজেট প্রস্তাব পেশ করেছেন।',
      category: 'economy',
      style: 'bangla_academy',
    };
    const res = CheckArticleRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects empty or too short content', () => {
    const empty = { content: ' ' };
    const res = CheckArticleRequestSchema.safeParse(empty);
    expect(res.success).toBe(false);
  });

  it('validates AI structured output schema', () => {
    const aiOutput = {
      issues: [
        {
          originalText: 'তৈরী',
          suggestedReplacement: 'তৈরি',
          category: 'spelling',
          explanation: 'অতৎসম শব্দে হ্রস্ব ই-কার হবে।',
          severity: 'medium',
          confidence: 0.95,
        },
      ],
      summaryBengali: 'বানান শুদ্ধিকরণ প্রয়োজন।',
      editorialWarnings: [],
    };
    const parsed = AiAnalysisResponseSchema.safeParse(aiOutput);
    expect(parsed.success).toBe(true);
  });
});

describe('Server-Side Offset Verifier', () => {
  it('verifies exact match and assigns correct start and end offsets', () => {
    const text = normalizeBengali('সচিবালয়ে প্রকল্পের রূপরেখা তৈরী করা হয়েছে।');
    const rawAiIssues = [
      {
        originalText: 'তৈরী',
        suggestedReplacement: 'তৈরি',
        category: 'spelling',
        explanation: 'ই-কার নিয়ম',
        startOffset: null,
        endOffset: null,
      },
    ];

    const verified = verifyAndAlignAiIssues(text, rawAiIssues);
    expect(verified[0].startOffset).not.toBeNull();
    const slice = text.slice(verified[0].startOffset!, verified[0].endOffset!);
    expect(slice).toBe('তৈরী');
  });

  it('flags quote-adjacent issues as requiring human review', () => {
    const text = normalizeBengali('তিনি বললেন, "আমরা তৈরী ছিলাম না।"');
    const rawAiIssues = [
      {
        originalText: 'তৈরী',
        suggestedReplacement: 'তৈরি',
        category: 'spelling',
        explanation: 'উদ্ধৃতিতে বানান সমস্যা',
      },
    ];

    const verified = verifyAndAlignAiIssues(text, rawAiIssues);
    expect(verified[0].requiresHumanReview).toBe(true);
  });
});

describe('Rate Limiting & Security', () => {
  it('allows normal requests and tracks count', () => {
    const testIp = '192.168.1.100';
    const res = checkRateLimit(testIp);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBeLessThan(res.limit);
  });

  it('blocks client when request threshold is exceeded', () => {
    const spamIp = '10.0.0.99';
    // Exhaust limit
    for (let i = 0; i < 40; i++) {
      checkRateLimit(spamIp);
    }
    const finalCheck = checkRateLimit(spamIp);
    expect(finalCheck.allowed).toBe(false);
    expect(finalCheck.remaining).toBe(0);
  });
});


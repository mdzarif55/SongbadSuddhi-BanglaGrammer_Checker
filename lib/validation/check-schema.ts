/**
 * Zod Schemas for API Input Validation and AI Structured Output Parsing
 */

import { z } from 'zod';

const MAX_CHARS = Number(process.env.MAX_ARTICLE_CHARS) || 25000;

export const ArticleCategorySchema = z.enum([
  'national',
  'politics',
  'economy',
  'international',
  'sports',
  'technology',
  'education',
  'entertainment',
  'other',
]);

export const EditorialStyleSchema = z.enum(['bangla_academy', 'modern_newsroom']);

export const CheckArticleRequestSchema = z.object({
  title: z.string().trim().max(300, 'শিরোনাম ৩০০ অক্ষরের মধ্যে হতে হবে।').optional().default(''),
  content: z
    .string({
      required_error: 'সংবাদের মূল বিষয়বস্তু খালি রাখা যাবে না।',
    })
    .trim()
    .min(5, 'সংবাদটি ন্যূনতম ৫ অক্ষরের হতে হবে।')
    .max(MAX_CHARS, `সংবাদের সর্বোচ্চ দৈর্ঘ্য ${MAX_CHARS} অক্ষরের বেশি হতে পারবে না।`),
  category: ArticleCategorySchema.optional().default('national'),
  style: EditorialStyleSchema.optional().default('bangla_academy'),
});

export const CorrectArticleRequestSchema = z.object({
  title: z.string().trim().max(300).optional().default(''),
  content: z
    .string({
      required_error: 'সংবাদের মূল বিষয়বস্তু খালি রাখা যাবে না।',
    })
    .trim()
    .min(5, 'সংবাদটি ন্যূনতম ৫ অক্ষরের হতে হবে।')
    .max(MAX_CHARS, `সংবাদের সর্বোচ্চ দৈর্ঘ্য ${MAX_CHARS} অক্ষরের বেশি হতে পারবে না।`),
  category: ArticleCategorySchema.optional().default('national'),
  style: EditorialStyleSchema.optional().default('bangla_academy'),
  preserveQuotes: z.boolean().optional().default(true),
});

export const AiIssueOutputSchema = z.object({
  id: z.string().optional(),
  originalText: z.string().min(1),
  suggestedReplacement: z.string().default(''),
  category: z.string(),
  explanation: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  confidence: z.number().min(0).max(1).optional().default(0.85),
  startOffset: z.number().nullable().optional(),
  endOffset: z.number().nullable().optional(),
  requiresHumanReview: z.boolean().optional().default(false),
  contextSentence: z.string().optional(),
});

export const AiAnalysisResponseSchema = z.object({
  issues: z.array(AiIssueOutputSchema).default([]),
  summaryBengali: z.string().default(''),
  editorialWarnings: z.array(z.string()).default([]),
});

export const AiCorrectResponseSchema = z.object({
  correctedArticle: z.string().min(1),
  correctedTitle: z.string().optional(),
  changesSummary: z.string().default(''),
  editorialWarnings: z.array(z.string()).default([]),
});


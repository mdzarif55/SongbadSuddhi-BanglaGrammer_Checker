/**
 * API Route: POST /api/check
 * Analyzes a Bengali newspaper article for spelling, grammar, punctuation, style, and editorial review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CheckArticleRequestSchema } from '@/lib/validation/check-schema';
import { analyzeArticleWithGemini } from '@/lib/ai/gemini';
import { checkRateLimit, sanitizeUntrustedArticleInput } from '@/lib/security/rate-limit';
import { CheckArticleResponse } from '@/types/proofreading';
import dictionaryData from '@/data/bengali_news_dictionary.json';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।',
          retryAfterSeconds: rateCheck.reset,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.reset),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }

    // 2. Parse and Validate Request Body
    const body = await req.json();
    const validationResult = CheckArticleRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'অনুরোধের তথ্য সঠিক নয়।';
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { title, content, category, style } = validationResult.data;

    // 3. Sanitize untrusted input against prompt injections
    const sanitizedTitle = sanitizeUntrustedArticleInput(title);
    const sanitizedContent = sanitizeUntrustedArticleInput(content);

    // 4. Perform Analysis
    const result = await analyzeArticleWithGemini({
      title: sanitizedTitle,
      content: sanitizedContent,
      category,
      style,
    });

    const response: CheckArticleResponse = {
      success: true,
      issues: result.issues,
      summary: result.summary,
      editorialStyle: style,
      articleCategory: category,
      processingTimeMs: Date.now() - startTime,
      meta: {
        dictionaryVersion: dictionaryData.metadata.version,
        aiModelUsed: result.modelName,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });
  } catch (error) {
    console.error('API /api/check unhandled error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'অভ্যন্তরীণ সার্ভার ত্রুটি ঘটেছে। কিছুক্ষণ পর পুনরায় চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}

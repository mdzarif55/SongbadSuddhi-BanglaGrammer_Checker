/**
 * API Route: POST /api/correct
 * Generates conservatively corrected complete Bengali news article, preserving names, quotes, numbers, and facts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CorrectArticleRequestSchema } from '@/lib/validation/check-schema';
import { correctArticleWithGemini } from '@/lib/ai/gemini';
import { checkRateLimit, sanitizeUntrustedArticleInput } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।',
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
    const validationResult = CorrectArticleRequestSchema.safeParse(body);

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

    const { title, content, category, style, preserveQuotes } = validationResult.data;

    // 3. Sanitize untrusted input
    const sanitizedTitle = sanitizeUntrustedArticleInput(title);
    const sanitizedContent = sanitizeUntrustedArticleInput(content);

    // 4. Perform Complete Conservative Correction
    const result = await correctArticleWithGemini({
      title: sanitizedTitle,
      content: sanitizedContent,
      category,
      style,
      preserveQuotes,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });
  } catch (error) {
    console.error('API /api/correct unhandled error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'লেখাটি সংশোধন প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}

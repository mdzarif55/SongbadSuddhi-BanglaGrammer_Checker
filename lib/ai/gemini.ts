/**
 * Official Google Gemini SDK Service for Bengali Newsroom Proofreader
 * Uses @google/genai with strict JSON validation, multi-model fallback, and graceful dictionary fallback.
 */

import { GoogleGenAI } from '@google/genai';
import {
  AiAnalysisResponseSchema,
  AiCorrectResponseSchema,
} from '../validation/check-schema';
import {
  buildEditorialSystemPrompt,
  buildProofreadUserPrompt,
  buildCorrectionUserPrompt,
} from './prompts';
import { verifyAndAlignAiIssues } from './offset-verifier';
import { bengaliDictionary } from '../dictionary';
import {
  EditorialStyle,
  ArticleCategory,
  Issue,
  AnalysisSummary,
  CorrectArticleResponse,
} from '@/types/proofreading';
import { normalizeBengali, normalizeTypography } from '../dictionary/normalize';

// Dynamically retrieve configured client
function getGenAIClient(): { client: GoogleGenAI | null; modelsToTry: string[] } {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return { client: null, modelsToTry: [] };
  }

  const primaryModel = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  // Robust fallback sequence in case of model retirement or temporary 503 high-demand spike
  const fallbackModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  const modelsToTry = [
    primaryModel,
    ...fallbackModels.filter((m) => m !== primaryModel),
  ];

  return { client: new GoogleGenAI({ apiKey }), modelsToTry };
}

/**
 * Strips potential markdown formatting wrappers around JSON responses
 */
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Performs full AI analysis of an article using Gemini, supplemented by the local dictionary.
 */
export async function analyzeArticleWithGemini(params: {
  title?: string;
  content: string;
  category?: ArticleCategory;
  style?: EditorialStyle;
}): Promise<{
  issues: Issue[];
  summary: AnalysisSummary;
  aiUsed: boolean;
  modelName: string;
}> {
  const { title, content, category = 'national', style = 'bangla_academy' } = params;
  const { client, modelsToTry } = getGenAIClient();
  const normalizedContent = normalizeBengali(content);

  // Compute text statistics
  const charCount = normalizedContent.length;
  const words = normalizedContent.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const paragraphs = normalizedContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length || 1;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  let issues: Issue[] = [];
  let summaryBengali = '';
  const editorialWarnings: string[] = [];
  let isAiActive = false;
  let successfulModel = '';

  // 1. First run deterministic dictionary and rule checks
  const dictIssues = bengaliDictionary.scanTextForDictionaryIssues(normalizedContent, style);
  const ruleIssues = bengaliDictionary.scanTextForRuleIssues(normalizedContent);

  if (client && modelsToTry.length > 0) {
    const systemPrompt = buildEditorialSystemPrompt(style, category);
    const userPrompt = buildProofreadUserPrompt(title, normalizedContent);

    // Try models in fallback order
    for (const modelCandidate of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model: modelCandidate,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const responseText = response.text || '';
        const parsedJson = JSON.parse(cleanJsonOutput(responseText));
        const validated = AiAnalysisResponseSchema.parse(parsedJson);

        // Verify and align offsets on the server
        const alignedAiIssues = verifyAndAlignAiIssues(normalizedContent, validated.issues);

        // Merge AI issues with dictionary issues, avoiding duplicates
        const existingOffsets = new Set<string>();
        for (const issue of alignedAiIssues) {
          if (issue.startOffset !== null) {
            existingOffsets.add(`${issue.startOffset}-${issue.endOffset}`);
          }
          issues.push(issue);
        }

        // Add dictionary/rule issues if not already covered
        for (const dIssue of [...dictIssues, ...ruleIssues]) {
          const key = `${dIssue.startOffset}-${dIssue.endOffset}`;
          if (!existingOffsets.has(key)) {
            issues.push(dIssue);
            existingOffsets.add(key);
          }
        }

        summaryBengali =
          validated.summaryBengali ||
          'সংবাদের প্রুফরিডিং ও বিশ্লেষণ সম্পন্ন হয়েছে। চিহ্নিত বিষয়সমূহ পর্যালোচনা করুন।';

        if (validated.editorialWarnings) {
          editorialWarnings.push(...validated.editorialWarnings);
        }

        isAiActive = true;
        successfulModel = modelCandidate;
        break; // Successfully completed!
      } catch (err: any) {
        console.warn(`Attempt with ${modelCandidate} failed:`, err?.message || err);
        // Continue to next model in sequence
      }
    }
  }

  // If AI was not active (either no client or all model attempts failed)
  if (!isAiActive) {
    issues = [...dictIssues, ...ruleIssues];
    summaryBengali =
      'বাংলা একাডেমি প্রমিত অভিধান ও সম্পাদকীয় নিয়মাবলি দ্বারা লেখাটি পরীক্ষা করা হয়েছে।';
    editorialWarnings.push(
      'Gemini API সংযোগ সাময়িকভাবে অপ্রাপ্য থাকায় অভিধান ও ব্যাকরণগত নিয়মের সাহায্যে ফলাফল প্রদর্শিত হচ্ছে।'
    );
  }

  // Count categories
  let spellingCount = 0;
  let grammarCount = 0;
  let punctuationCount = 0;
  let styleCount = 0;
  let clarityCount = 0;
  let editorialWarningCount = 0;

  for (const issue of issues) {
    switch (issue.category) {
      case 'spelling':
        spellingCount++;
        break;
      case 'grammar':
        grammarCount++;
        break;
      case 'punctuation':
        punctuationCount++;
        break;
      case 'style':
        styleCount++;
        break;
      case 'clarity':
        clarityCount++;
        break;
      case 'editorial_warning':
        editorialWarningCount++;
        break;
    }
  }

  const summary: AnalysisSummary = {
    totalIssues: issues.length,
    spellingCount,
    grammarCount,
    punctuationCount,
    styleCount,
    clarityCount,
    editorialWarningCount,
    wordCount,
    characterCount: charCount,
    paragraphCount,
    readingTimeMinutes,
    summaryBengali,
    editorialWarnings,
    isDictionaryActive: true,
    isAiActive,
    editorialStyle: style,
  };

  return {
    issues,
    summary,
    aiUsed: isAiActive,
    modelName: isAiActive ? successfulModel : 'Local Dictionary Engine',
  };
}

/**
 * Conservatively corrects an entire article using Gemini or local rules
 */
export async function correctArticleWithGemini(params: {
  title?: string;
  content: string;
  category?: ArticleCategory;
  style?: EditorialStyle;
  preserveQuotes?: boolean;
}): Promise<CorrectArticleResponse> {
  const startTime = Date.now();
  const {
    title,
    content,
    category = 'national',
    style = 'bangla_academy',
    preserveQuotes = true,
  } = params;

  const { client, modelsToTry } = getGenAIClient();
  const normalizedContent = normalizeBengali(content);

  if (client && modelsToTry.length > 0) {
    const systemPrompt = buildEditorialSystemPrompt(style, category);
    const userPrompt = buildCorrectionUserPrompt(title, normalizedContent, preserveQuotes);

    for (const modelCandidate of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model: modelCandidate,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const parsed = JSON.parse(cleanJsonOutput(response.text || ''));
        const validated = AiCorrectResponseSchema.parse(parsed);

        return {
          success: true,
          originalArticle: normalizedContent,
          correctedArticle: normalizeBengali(validated.correctedArticle),
          correctedTitle: validated.correctedTitle
            ? normalizeBengali(validated.correctedTitle)
            : title,
          changesApplied: 1,
          editorialWarnings: validated.editorialWarnings || [],
          summaryBengali:
            validated.changesSummary ||
            'সংবাদের নাম, পরিসংখ্যান ও উদ্ধৃতি অক্ষুণ্ণ রেখে প্রমিত বাংলা সংবাদরীতি অনুযায়ী সম্পূর্ণ লেখা সংশোধন করা হয়েছে।',
          processingTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.warn(`Correction attempt with ${modelCandidate} failed:`, err?.message || err);
      }
    }
  }

  // Graceful fallback: normalize typography and dictionary misspellings
  let corrected = normalizeTypography(normalizedContent);
  const dictIssues = bengaliDictionary.scanTextForDictionaryIssues(corrected, style);
  let changes = 0;

  for (const issue of dictIssues) {
    if (issue.startOffset !== null && issue.endOffset !== null) {
      corrected =
        corrected.slice(0, issue.startOffset) +
        issue.suggestedReplacement +
        corrected.slice(issue.endOffset);
      changes++;
    }
  }

  return {
    success: true,
    originalArticle: normalizedContent,
    correctedArticle: corrected,
    correctedTitle: title,
    changesApplied: changes,
    editorialWarnings: [
      'Gemini API সংযোগ না থাকায় স্থানীয় অভিধান ও প্রমিত বিরামচিহ্ন নিয়মানুযায়ী স্বয়ংক্রিয় সংশোধন প্রয়োগ করা হয়েছে।',
    ],
    summaryBengali: 'স্থানীয় বাংলা অভিধান ও মুদ্রণ নিয়মের ভিত্তিতে সংশোধন প্রয়োগ করা হয়েছে।',
    processingTimeMs: Date.now() - startTime,
  };
}

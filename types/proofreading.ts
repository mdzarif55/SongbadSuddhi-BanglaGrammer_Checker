export type IssueCategory =
  | 'spelling'
  | 'grammar'
  | 'punctuation'
  | 'style'
  | 'clarity'
  | 'editorial_warning';

export type IssueSeverity = 'low' | 'medium' | 'high';

export type EditorialStyle = 'bangla_academy' | 'modern_newsroom';

export type ArticleCategory =
  | 'national'
  | 'politics'
  | 'economy'
  | 'international'
  | 'sports'
  | 'technology'
  | 'education'
  | 'entertainment'
  | 'other';

export interface Issue {
  id: string;
  originalText: string;
  suggestedReplacement: string;
  category: IssueCategory;
  explanation: string; // Detailed Bengali explanation
  severity: IssueSeverity;
  confidence: number; // 0.0 to 1.0
  startOffset: number | null; // Verified character offset in original text
  endOffset: number | null;
  requiresHumanReview: boolean; // Flag if quote, fact, or ambiguous
  source: 'ai' | 'dictionary' | 'rule';
  ruleId?: string;
  contextSentence?: string;
}

export interface AnalysisSummary {
  totalIssues: number;
  spellingCount: number;
  grammarCount: number;
  punctuationCount: number;
  styleCount: number;
  clarityCount: number;
  editorialWarningCount: number;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
  summaryBengali: string;
  editorialWarnings: string[];
  isDictionaryActive: boolean;
  isAiActive: boolean;
  editorialStyle: EditorialStyle;
}

export interface CheckArticleRequest {
  title?: string;
  content: string;
  category?: ArticleCategory;
  style?: EditorialStyle;
}

export interface CheckArticleResponse {
  success: boolean;
  issues: Issue[];
  summary: AnalysisSummary;
  editorialStyle: EditorialStyle;
  articleCategory: ArticleCategory;
  processingTimeMs: number;
  meta: {
    dictionaryVersion: string;
    aiModelUsed: string;
  };
}

export interface CorrectArticleRequest {
  title?: string;
  content: string;
  category?: ArticleCategory;
  style?: EditorialStyle;
  preserveQuotes?: boolean;
}

export interface CorrectArticleResponse {
  success: boolean;
  originalArticle: string;
  correctedArticle: string;
  correctedTitle?: string;
  changesApplied: number;
  editorialWarnings: string[];
  summaryBengali: string;
  processingTimeMs: number;
}

export interface TextCorrectionDiff {
  type: 'unchanged' | 'removed' | 'added';
  value: string;
}

export interface EditorialPreset {
  id: string;
  title: string;
  category: ArticleCategory;
  content: string;
  description: string;
  expectedIssues: string;
}


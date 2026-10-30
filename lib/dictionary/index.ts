/**
 * Replaceable Bengali Dictionary and Rule-Based Editorial Engine
 * Operates independently from the AI service to provide fast, deterministic checks
 * and fallback verification.
 */

import dictionaryData from '@/data/bengali_news_dictionary.json';
import { normalizeBengali, tokenizeBengaliWords } from './normalize';
import { findSuggestions } from './suggestions';
import { Issue, EditorialStyle } from '@/types/proofreading';

const BENGALI_INFLECTIONAL_SUFFIXES = [
  // Multi-character / layered suffixes
  'গুলোতে', 'গুলোকে', 'গুলোর', 'গুলোয়', 'গুলির', 'গুলিতে', 'গুলিকে',
  'খানিতে', 'খানির', 'খানাকে', 'খানার',
  'দেরকে', 'দিগকে', 'সমূহকে', 'সমূহের',
  'ভাবে', 'মুখী', 'মুখীন', 'শীল', 'শীলতা', 'হীন', 'যুক্ত', 'মূলক', 'ভিত্তিক',
  'তা', 'ত্ব', 'সমূহ', 'গণ', 'বর্গ', 'মণ্ডল',
  'গুলো', 'গুলি', 'খানা', 'খানি',
  'টিতে', 'টিকে', 'টির',
  'টাতে', 'টাকে', 'টার',
  'দের', 'রা',
  'টি', 'টা',
  'কে', 'রে', 'তে', 'য়ে', 'র', 'ের', 'ে', 'য়',
  'ই', 'ও'
];

export interface MisspellingEntry {
  wrong: string;
  correct: string;
  category: 'spelling' | 'grammar' | 'punctuation' | 'style' | 'clarity';
  explanation: string;
  style: string;
  severity: 'low' | 'medium' | 'high';
}

export interface EditorialRuleEntry {
  id: string;
  name: string;
  pattern: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  category: 'spelling' | 'grammar' | 'punctuation' | 'style' | 'clarity';
}

export interface BengaliDictionaryInterface {
  lookupWord(word: string): boolean;
  lookupMisspelling(word: string): MisspellingEntry | null;
  getSuggestions(word: string, limit?: number): string[];
  isProtectedEntity(entity: string): boolean;
  scanTextForDictionaryIssues(content: string, style?: EditorialStyle): Issue[];
  scanTextForRuleIssues(content: string): Issue[];
  getInfo(): {
    name: string;
    version: string;
    license: string;
    totalEntries: number;
    description: string;
    isAvailable: boolean;
  };
}

class BengaliDictionaryEngine implements BengaliDictionaryInterface {
  private standardWordSet: Set<string>;
  private misspellingMap: Map<string, MisspellingEntry>;
  private protectedEntitiesSet: Set<string>;
  private editorialRules: EditorialRuleEntry[];
  private allVocabularyList: string[];
  private metadata: typeof dictionaryData.metadata;

  constructor() {
    this.metadata = dictionaryData.metadata;
    this.standardWordSet = new Set();
    for (const word of dictionaryData.standardWords) {
      this.standardWordSet.add(normalizeBengali(word));
    }

    this.misspellingMap = new Map();
    for (const item of dictionaryData.misspellings) {
      this.misspellingMap.set(normalizeBengali(item.wrong), {
        ...item,
        wrong: normalizeBengali(item.wrong),
        correct: normalizeBengali(item.correct),
      } as MisspellingEntry);
      // Also add the correct word to standard words
      this.standardWordSet.add(normalizeBengali(item.correct));
    }

    this.protectedEntitiesSet = new Set(
      dictionaryData.protectedEntities.map((e) => normalizeBengali(e))
    );

    this.editorialRules = dictionaryData.editorialRules as EditorialRuleEntry[];

    // Canonical normalized vocabulary list
    this.allVocabularyList = Array.from(this.standardWordSet);
  }

  public lookupWord(word: string): boolean {
    const norm = normalizeBengali(word.trim());
    return this.standardWordSet.has(norm) || this.protectedEntitiesSet.has(norm);
  }

  public lookupMisspelling(word: string): MisspellingEntry | null {
    const norm = normalizeBengali(word.trim());
    return this.misspellingMap.get(norm) || null;
  }

  public getSuggestions(word: string, limit = 4): string[] {
    return findSuggestions(word, this.allVocabularyList, limit);
  }

  public isProtectedEntity(entity: string): boolean {
    const norm = normalizeBengali(entity.trim());
    return this.protectedEntitiesSet.has(norm);
  }

  public isValidBengaliWord(word: string, depth = 0): boolean {
    const norm = normalizeBengali(word.trim());
    if (!norm) return true;
    if (this.lookupWord(norm)) return true;
    if (norm.length <= 1) return true; // Single letter or punctuation
    if (/^[০-৯0-9]+$/.test(norm)) return true; // Numerals

    // Suffix stripping check (up to 2 levels of layered suffixes)
    if (depth < 2) {
      for (const suffix of BENGALI_INFLECTIONAL_SUFFIXES) {
        if (norm.length > suffix.length + 1 && norm.endsWith(suffix)) {
          const stem = norm.slice(0, -suffix.length);
          if (this.isValidBengaliWord(stem, depth + 1)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Scans text for known misspellings and unknown near-miss words directly from the lexicon
   */
  public scanTextForDictionaryIssues(content: string, _style: EditorialStyle = 'bangla_academy'): Issue[] {
    if (!content) return [];
    const normalized = normalizeBengali(content);
    const tokens = tokenizeBengaliWords(normalized);
    const issues: Issue[] = [];
    let counter = 0;

    for (const token of tokens) {
      // 1. Direct match with curated editorial misspellings
      const match = this.lookupMisspelling(token.word);
      if (match) {
        issues.push({
          id: `dict-${Date.now()}-${++counter}`,
          originalText: token.word,
          suggestedReplacement: match.correct,
          category: match.category,
          explanation: match.explanation,
          severity: match.severity,
          confidence: 0.98,
          startOffset: token.start,
          endOffset: token.end,
          requiresHumanReview: false,
          source: 'dictionary',
          ruleId: `lexicon-${token.word}`,
        });
        continue;
      }

      // 2. Near-miss spelling check against 436k vocabulary
      if (!this.isValidBengaliWord(token.word)) {
        const suggestions = this.getSuggestions(token.word, 3);
        if (suggestions.length > 0) {
          issues.push({
            id: `dict-near-${Date.now()}-${++counter}`,
            originalText: token.word,
            suggestedReplacement: suggestions[0],
            category: 'spelling',
            explanation: `শব্দটি প্রমিত বাংলা অভিধানে নেই। সম্ভাব্য শুদ্ধ রূপ: ${suggestions.join(', ')}`,
            severity: 'medium',
            confidence: 0.92,
            startOffset: token.start,
            endOffset: token.end,
            requiresHumanReview: false,
            source: 'dictionary',
            ruleId: `spell-suggest-${token.word}`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Scans text for regex editorial rules (double plurals, Dari spacing, English periods)
   */
  public scanTextForRuleIssues(content: string): Issue[] {
    if (!content) return [];
    const normalized = normalizeBengali(content);
    const issues: Issue[] = [];
    let counter = 0;

    for (const rule of this.editorialRules) {
      try {
        const regex = new RegExp(rule.pattern, 'gu');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(normalized)) !== null) {
          const matchedText = match[0];
          const start = match.index;
          const end = start + matchedText.length;

          let replacement = matchedText;
          if (rule.id === 'space_before_dari') {
            replacement = '।';
          } else if (rule.id === 'missing_space_after_dari') {
            replacement = '। ' + match[2];
          } else if (rule.id === 'english_period') {
            replacement = match[1] + '।';
          } else if (rule.id === 'double_plural') {
            // Suggest singularizing or dropping the modifier
            // e.g. "সব ছাত্ররা" -> "সব ছাত্র"
            replacement = match[1] + ' ' + match[2];
          } else if (rule.id === 'honorific_agreement') {
            const verb = match[3];
            let fixedVerb = verb;
            if (verb === 'বলেছে') fixedVerb = 'বলেছেন';
            else if (verb === 'করেছে') fixedVerb = 'করেছেন';
            else if (verb === 'গেছে') fixedVerb = 'গেছেন';
            else if (verb === 'দিয়েছে') fixedVerb = 'দিয়েছেন';
            else if (verb === 'জানিয়েছে') fixedVerb = 'জানিয়েছেন';

            replacement = matchedText.replace(new RegExp(`${verb}$`), fixedVerb);
          }

          issues.push({
            id: `rule-${rule.id}-${++counter}`,
            originalText: matchedText,
            suggestedReplacement: replacement,
            category: rule.category,
            explanation: rule.explanation,
            severity: rule.severity,
            confidence: 0.95,
            startOffset: start,
            endOffset: end,
            requiresHumanReview: rule.id === 'repeated_words',
            source: 'rule',
            ruleId: rule.id,
          });
        }
      } catch (err) {
        console.error(`Rule execution error for ${rule.id}:`, err);
      }
    }

    return issues;
  }

  public getInfo() {
    return {
      name: this.metadata.name,
      version: this.metadata.version,
      license: this.metadata.license,
      totalEntries: this.metadata.totalEntries,
      description: this.metadata.description,
      isAvailable: true,
    };
  }
}

// Singleton dictionary instance
export const bengaliDictionary = new BengaliDictionaryEngine();


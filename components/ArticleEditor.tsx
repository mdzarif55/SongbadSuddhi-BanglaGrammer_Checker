'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  Copy,
  Clock,
  FileText,
  Layers,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit3,
} from 'lucide-react';
import { ArticleCategory, Issue } from '@/types/proofreading';

interface ArticleEditorProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  category: ArticleCategory;
  setCategory: (category: ArticleCategory) => void;
  onCheckArticle: () => void;
  onAutoCorrectArticle: () => void;
  onClear: () => void;
  isLoading: boolean;
  isCorrecting: boolean;
  error: string | null;
  onRetry: () => void;
  // Interactive error highlight props
  issues?: Issue[];
  issueStatuses?: Record<string, 'pending' | 'accepted' | 'rejected'>;
  activeIssueId?: string | null;
  onSelectIssue?: (issueId: string) => void;
  onAcceptIssue?: (issue: Issue) => void;
}

const CATEGORIES: { id: ArticleCategory; label: string }[] = [
  { id: 'national', label: 'জাতীয়' },
  { id: 'politics', label: 'রাজনীতি' },
  { id: 'economy', label: 'অর্থনীতি' },
  { id: 'international', label: 'আন্তর্জাতিক' },
  { id: 'sports', label: 'খেলাধুলা' },
  { id: 'technology', label: 'তথ্যপ্রযুক্তি' },
  { id: 'education', label: 'শিক্ষা' },
  { id: 'entertainment', label: 'বিনোদন' },
  { id: 'other', label: 'অন্যান্য' },
];

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  title,
  setTitle,
  content,
  setContent,
  category,
  setCategory,
  onCheckArticle,
  onAutoCorrectArticle,
  onClear,
  isLoading,
  isCorrecting,
  error,
  onRetry,
  issues = [],
  issueStatuses = {},
  activeIssueId = null,
  onSelectIssue,
  onAcceptIssue,
}) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'edit'>('edit');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Live stats calculation
  const charCount = content.length;
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = content.trim() ? words.length : 0;
  const paragraphCount = content.trim()
    ? content.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  // Get only pending issues for red underlines
  const pendingIssues = issues.filter(
    (i) => (issueStatuses[i.id] || 'pending') === 'pending'
  );

  // Auto switch to interactive view when issues arrive
  useEffect(() => {
    if (pendingIssues.length > 0) {
      setViewMode('interactive');
    }
  }, [issues.length]);

  // Smooth scroll and blimp when activeIssueId changes
  useEffect(() => {
    if (activeIssueId && viewMode === 'interactive') {
      const el = document.getElementById(`issue-anchor-${activeIssueId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIssueId, viewMode]);

  const handleCopyInput = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      alert('সংবাদের মূল লেখা কপি করা হয়েছে!');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Builds interactive segments for rendering red-underlined errors
   */
  const renderHighlightedContent = () => {
    if (!content) return null;
    if (pendingIssues.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800 font-bengali">
          {content}
        </div>
      );
    }

    // Resolve accurate start/end for each pending issue
    const validIssues: (Issue & { start: number; end: number })[] = [];
    for (const issue of pendingIssues) {
      let start = issue.startOffset;
      let end = issue.endOffset;

      if (
        start === null ||
        end === null ||
        start === undefined ||
        end === undefined ||
        content.slice(start, end) !== issue.originalText
      ) {
        const foundIdx = content.indexOf(issue.originalText);
        if (foundIdx !== -1) {
          start = foundIdx;
          end = foundIdx + issue.originalText.length;
        } else {
          continue;
        }
      }

      validIssues.push({ ...issue, start, end });
    }

    // Sort ascending by start offset
    validIssues.sort((a, b) => a.start - b.start);

    // Filter overlapping issues
    const nonOverlapping: (Issue & { start: number; end: number })[] = [];
    let lastEnd = -1;
    for (const item of validIssues) {
      if (item.start >= lastEnd) {
        nonOverlapping.push(item);
        lastEnd = item.end;
      }
    }

    // Slice segments
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    nonOverlapping.forEach((item, idx) => {
      // Plain text before the issue
      if (item.start > currentIndex) {
        segments.push(
          <span key={`text-${idx}-${currentIndex}`}>
            {content.slice(currentIndex, item.start)}
          </span>
        );
      }

      const isActive = activeIssueId === item.id;

      // Highlighted issue with red underline and click-to-blimp
      segments.push(
        <span
          key={`issue-${item.id}`}
          id={`issue-anchor-${item.id}`}
          onClick={() => onSelectIssue?.(item.id)}
          className={`inline-block transition-all duration-300 rounded px-1 py-0.5 cursor-pointer font-medium ${
            isActive
              ? 'animate-blimp text-rose-950 font-bold rounded ring-2 ring-rose-500 z-10'
              : 'bg-rose-50 text-rose-950 underline decoration-rose-500 decoration-wavy underline-offset-4 border-b border-rose-400 hover:bg-rose-100 hover:border-rose-600'
          }`}
          title={`ভুল: ${item.originalText} ➔ সঠিক: ${item.suggestedReplacement}\n(${item.explanation})\nক্লিক করে দেখুন`}
        >
          {content.slice(item.start, item.end)}
        </span>
      );

      currentIndex = item.end;
    });

    // Remaining text after last issue
    if (currentIndex < content.length) {
      segments.push(
        <span key={`text-end-${currentIndex}`}>
          {content.slice(currentIndex)}
        </span>
      );
    }

    return (
      <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800 font-bengali">
        {segments}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Top Bar: Title & Category */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="সংবাদের শিরোনাম লিখুন (ঐচ্ছিক)..."
            className="flex-1 px-3.5 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline">
              বিভাগ:
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArticleCategory)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode toggle (Visible when issues exist) */}
        {issues.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'interactive'
                    ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-rose-600" />
                চিহ্নিত ত্রুটি ভিউ ({pendingIssues.length})
              </button>

              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                সরাসরি লিখুন / এডিট
              </button>
            </div>

            {pendingIssues.length > 0 && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                💡 লাল আন্ডারলাইনযুক্ত শব্দে ক্লিক করলে ডানপাশে বিস্তারিত দেখাবে
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Text Content Area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 p-4 sm:p-5 flex flex-col min-h-[360px] overflow-y-auto"
      >
        {viewMode === 'interactive' && issues.length > 0 ? (
          <div className="flex-1 min-h-[300px] select-text">
            {renderHighlightedContent()}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="এখানে আপনার সংবাদের খসড়া প্রতিবেদন পেস্ট করুন অথবা লিখুন... 

যেমন: 
সচিবালয়ে আজ এক উচ্চপর্যায়ের বৈঠক অনুষ্ঠিত হয়েছে । বৈঠকে সরকারী কর্মকর্তাদের উপস্থিতিতে নতুন প্রকল্পের রূপরেখা তৈরী করা হয়। তিনি বলেছে যে আগামী মাসেই কাজ শুরু হবে।"
            className="w-full flex-1 resize-y min-h-[300px] text-base leading-relaxed text-slate-800 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-slate-400 font-bengali"
            disabled={isLoading || isCorrecting}
            spellCheck={false}
          />
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={onRetry}
              className="flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 underline ml-2"
            >
              <RefreshCw className="w-3 h-3" />
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}
      </div>

      {/* Editor Footer: Statistics & Actions */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Statistics Pills */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <strong className="text-slate-900">{charCount}</strong> অক্ষর
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <strong className="text-slate-900">{wordCount}</strong> শব্দ
          </span>
          <span className="text-slate-300">|</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <strong className="text-slate-900">{paragraphCount}</strong> অনুচ্ছেদ
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />~{readingTime} মিনিট
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onClear}
            disabled={!content || isLoading || isCorrecting}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
            title="লেখা মুছুন"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopyInput}
            disabled={!content}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
            title="মূল লেখা কপি করুন"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Full auto-correct button */}
          <button
            type="button"
            onClick={onAutoCorrectArticle}
            disabled={!content.trim() || isLoading || isCorrecting}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="নাম ও উক্তি অক্ষুণ্ণ রেখে পুরো লেখা স্বয়ংক্রিয় সংশোধন করুন"
          >
            {isCorrecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                সংশোধন হচ্ছে...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                সম্পূর্ণ লেখা সংশোধন করুন
              </>
            )}
          </button>

          {/* Proofread check button */}
          <button
            type="button"
            onClick={onCheckArticle}
            disabled={!content.trim() || isLoading || isCorrecting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                পরীক্ষা চলছে...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                লেখা পরীক্ষা করুন
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

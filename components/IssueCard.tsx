'use client';

import React from 'react';
import {
  Check,
  X,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Issue, IssueCategory, IssueSeverity } from '@/types/proofreading';

interface IssueCardProps {
  issue: Issue;
  status: 'pending' | 'accepted' | 'rejected';
  onAccept: (issue: Issue) => void;
  onReject: (issue: Issue) => void;
  onUndo: (issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  status,
  onAccept,
  onReject,
  onUndo,
}) => {
  const getCategoryDetails = (cat: IssueCategory) => {
    switch (cat) {
      case 'spelling':
        return { label: 'বানান', badge: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'grammar':
        return { label: 'ব্যাকরণ', badge: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'punctuation':
        return { label: 'বিরামচিহ্ন', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'style':
        return { label: 'সংবাদশৈলী', badge: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'clarity':
        return { label: 'স্পষ্টতা', badge: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'editorial_warning':
        return { label: 'সম্পাদকীয় সতর্কতা', badge: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
  };

  const getSeverityDetails = (sev: IssueSeverity) => {
    switch (sev) {
      case 'high':
        return { label: 'জরুরি', badge: 'text-rose-700 bg-rose-50' };
      case 'medium':
        return { label: 'মাঝারি', badge: 'text-amber-700 bg-amber-50' };
      case 'low':
        return { label: 'সাধারণ', badge: 'text-slate-600 bg-slate-100' };
    }
  };

  const catDetails = getCategoryDetails(issue.category);
  const sevDetails = getSeverityDetails(issue.severity);

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-150 ${
        status === 'accepted'
          ? 'bg-emerald-50/40 border-emerald-300 opacity-80'
          : status === 'rejected'
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      {/* Header: Badges & Severity */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${catDetails.badge}`}
          >
            {catDetails.label}
          </span>

          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${sevDetails.badge}`}
          >
            গুরুত্ব: {sevDetails.label}
          </span>

          {issue.requiresHumanReview && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-md flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              সম্পাদকীয় যাচাই প্রয়োজন
            </span>
          )}
        </div>

        {/* Source badge */}
        <span
          className="text-[10px] text-slate-400 flex items-center gap-1"
          title={issue.source === 'ai' ? 'Gemini AI দ্বারা চিহ্নিত' : 'প্রেস লেক্সিকন দ্বারা চিহ্নিত'}
        >
          {issue.source === 'ai' ? (
            <>
              <Sparkles className="w-3 h-3 text-teal-600" />
              AI
            </>
          ) : (
            <>
              <BookOpen className="w-3 h-3 text-emerald-600" />
              অভিধান
            </>
          )}
        </span>
      </div>

      {/* Main Diff Block: Original vs Suggested */}
      <div className="flex items-center flex-wrap gap-2 py-1 text-sm font-bengali">
        <span className="line-through decoration-rose-500 decoration-2 text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
          {issue.originalText}
        </span>

        {issue.suggestedReplacement ? (
          <>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded font-bold border border-emerald-300">
              {issue.suggestedReplacement}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">(বর্জনের প্রস্তাব)</span>
        )}
      </div>

      {/* Explanation in Bengali */}
      <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
        {issue.explanation}
      </p>

      {/* Action Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          {issue.startOffset !== null ? (
            <span className="text-slate-500">
              অবস্থান: {issue.startOffset}–{issue.endOffset}
            </span>
          ) : (
            <span className="text-amber-600 italic">উদ্ধৃতি বা মুক্ত পর্যালোচনা</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => onReject(issue)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1"
                title="প্রস্তাবনাটি বাতিল করুন"
              >
                <X className="w-3.5 h-3.5" />
                বাতিল
              </button>

              <button
                type="button"
                onClick={() => onAccept(issue)}
                className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-300 transition-all flex items-center gap-1"
                title="এই সংশোধনটি প্রয়োগ করুন"
              >
                <Check className="w-3.5 h-3.5" />
                গ্রহণ করুন
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold ${
                  status === 'accepted' ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {status === 'accepted' ? 'প্রয়োগ করা হয়েছে' : 'বাতিল করা হয়েছে'}
              </span>

              <button
                type="button"
                onClick={() => onUndo(issue)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                title="পূর্বাবস্থায় ফিরিয়ে নিন"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

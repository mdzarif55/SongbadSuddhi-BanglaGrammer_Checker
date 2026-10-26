'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { ArticleEditor } from '@/components/ArticleEditor';
import { AnalysisSummary } from '@/components/AnalysisSummary';
import { IssuePanel } from '@/components/IssuePanel';
import { ArticleComparison } from '@/components/ArticleComparison';
import {
  ArticleCategory,
  EditorialStyle,
  Issue,
  IssueCategory,
  AnalysisSummary as SummaryType,
  EditorialPreset,
  CheckArticleResponse,
  CorrectArticleResponse,
} from '@/types/proofreading';
import {
  applySafeReplacements,
  recomputeRemainingOffsets,
} from '@/lib/correction/apply-corrections';
import { SAMPLE_ARTICLES } from '@/lib/presets/sample-articles';
import { normalizeBengali } from '@/lib/dictionary/normalize';

export default function ProofreaderPage() {
  // Input states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(SAMPLE_ARTICLES[0].content);
  const [category, setCategory] = useState<ArticleCategory>('national');
  const [editorialStyle, setEditorialStyle] = useState<EditorialStyle>('bangla_academy');

  // Working & Snapshot states
  const [originalSnapshot, setOriginalSnapshot] = useState(SAMPLE_ARTICLES[0].content);
  const [workingText, setWorkingText] = useState(SAMPLE_ARTICLES[0].content);

  // Analysis result states
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueStatuses, setIssueStatuses] = useState<
    Record<string, 'pending' | 'accepted' | 'rejected'>
  >({});
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [activeFilter, setActiveFilter] = useState<IssueCategory | 'all'>('all');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiActive, setIsAiActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'comparison'>('editor');

  // Load a preset
  const handleSelectPreset = (preset: EditorialPreset) => {
    setTitle(preset.title);
    setContent(preset.content);
    setCategory(preset.category);
    setOriginalSnapshot(preset.content);
    setWorkingText(preset.content);
    setIssues([]);
    setIssueStatuses({});
    setSummary(null);
    setError(null);
    setActiveTab('editor');
  };

  // 1. Analyze / Check Article
  const handleCheckArticle = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: normalizeBengali(content),
          category,
          style: editorialStyle,
        }),
      });

      const data: CheckArticleResponse & { error?: string } = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'লেখাটি পরীক্ষা করার সময় সার্ভারে সমস্যা হয়েছে।');
      }

      setIssues(data.issues);
      setSummary(data.summary);
      setIsAiActive(data.summary.isAiActive);

      // Initialize all issue statuses as 'pending'
      const initialStatuses: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
      data.issues.forEach((issue) => {
        initialStatuses[issue.id] = 'pending';
      });
      setIssueStatuses(initialStatuses);

      setOriginalSnapshot(content);
      setWorkingText(content);
    } catch (err: any) {
      console.error('Check failed:', err);
      setError(err.message || 'নেটওয়ার্ক বা সার্ভারে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Full Auto-Correct Article
  const handleAutoCorrectArticle = async () => {
    if (!content.trim()) return;

    setIsCorrecting(true);
    setError(null);

    try {
      const res = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: normalizeBengali(content),
          category,
          style: editorialStyle,
          preserveQuotes: true,
        }),
      });

      const data: CorrectArticleResponse & { error?: string } = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'সংশোধন প্রক্রিয়া সম্পন্ন করা যায়নি।');
      }

      setWorkingText(data.correctedArticle);
      if (data.correctedTitle) {
        setTitle(data.correctedTitle);
      }
      setActiveTab('comparison');
    } catch (err: any) {
      console.error('Auto-correct failed:', err);
      setError(err.message || 'স্বয়ংক্রিয় সংশোধন প্রক্রিয়ায় সমস্যা হয়েছে।');
    } finally {
      setIsCorrecting(false);
    }
  };

  // 3. Accept Individual Issue
  const handleAcceptIssue = (issue: Issue) => {
    const updatedStatuses = { ...issueStatuses, [issue.id]: 'accepted' as const };
    setIssueStatuses(updatedStatuses);

    // Apply all currently accepted issues from originalSnapshot
    const acceptedIssues = issues.filter(
      (i) => i.id === issue.id || updatedStatuses[i.id] === 'accepted'
    );

    const replacementResult = applySafeReplacements(originalSnapshot, acceptedIssues);
    setWorkingText(replacementResult.updatedText);

    // Recompute offsets for the remaining pending issues
    const remainingPending = issues.filter((i) => updatedStatuses[i.id] === 'pending');
    const alignedRemaining = recomputeRemainingOffsets(
      replacementResult.updatedText,
      remainingPending
    );

    // Update issue offsets in state
    setIssues((prev) =>
      prev.map((i) => {
        const found = alignedRemaining.find((r) => r.id === i.id);
        return found ? found : i;
      })
    );
  };

  // 4. Reject Individual Issue
  const handleRejectIssue = (issue: Issue) => {
    setIssueStatuses((prev) => ({ ...prev, [issue.id]: 'rejected' }));
  };

  // 5. Undo Issue Action
  const handleUndoIssue = (issue: Issue) => {
    const updatedStatuses = { ...issueStatuses, [issue.id]: 'pending' as const };
    setIssueStatuses(updatedStatuses);

    // Re-apply remaining accepted issues
    const acceptedIssues = issues.filter((i) => updatedStatuses[i.id] === 'accepted');
    const replacementResult = applySafeReplacements(originalSnapshot, acceptedIssues);
    setWorkingText(replacementResult.updatedText);
  };

  // 6. Accept All Pending Issues
  const handleAcceptAll = () => {
    const updatedStatuses = { ...issueStatuses };
    const toApply: Issue[] = [];

    issues.forEach((issue) => {
      if ((updatedStatuses[issue.id] || 'pending') === 'pending') {
        updatedStatuses[issue.id] = 'accepted';
        toApply.push(issue);
      } else if (updatedStatuses[issue.id] === 'accepted') {
        toApply.push(issue);
      }
    });

    const replacementResult = applySafeReplacements(originalSnapshot, toApply);
    setWorkingText(replacementResult.updatedText);
    setIssueStatuses(updatedStatuses);
    setActiveTab('comparison');
  };

  // 7. Reject All Pending Issues
  const handleRejectAll = () => {
    setIssueStatuses((prev) => {
      const next = { ...prev };
      issues.forEach((issue) => {
        if ((next[issue.id] || 'pending') === 'pending') {
          next[issue.id] = 'rejected';
        }
      });
      return next;
    });
  };

  // 8. Reset All Changes
  const handleResetAll = () => {
    setWorkingText(originalSnapshot);
    const resetStatuses: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
    issues.forEach((issue) => {
      resetStatuses[issue.id] = 'pending';
    });
    setIssueStatuses(resetStatuses);
  };

  // 9. Clear Everything
  const handleClear = () => {
    setTitle('');
    setContent('');
    setOriginalSnapshot('');
    setWorkingText('');
    setIssues([]);
    setIssueStatuses({});
    setSummary(null);
    setError(null);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Header */}
      <Header
        editorialStyle={editorialStyle}
        onStyleChange={setEditorialStyle}
        onSelectPreset={handleSelectPreset}
        isAiActive={isAiActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Summary Card (If analysis has been executed) */}
        {summary && (
          <AnalysisSummary
            summary={summary}
            selectedFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}

        {/* Workspace Layout: Split between Editor and Issues/Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Article Input Editor (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <ArticleEditor
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              category={category}
              setCategory={setCategory}
              onCheckArticle={handleCheckArticle}
              onAutoCorrectArticle={handleAutoCorrectArticle}
              onClear={handleClear}
              isLoading={isLoading}
              isCorrecting={isCorrecting}
              error={error}
              onRetry={handleCheckArticle}
            />
          </div>

          {/* Right Column: Issues Panel & Comparison (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* View Switcher Tabs (Only if issues or corrections exist) */}
            {(issues.length > 0 || workingText !== content) && (
              <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  চিহ্নিত বিষয়সমূহ ({issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comparison')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'comparison'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সংশোধিত ফলাফল
                </button>
              </div>
            )}

            {/* Display Active Panel */}
            {activeTab === 'comparison' ? (
              <ArticleComparison
                originalText={originalSnapshot}
                correctedText={workingText}
                title={title}
              />
            ) : (
              <IssuePanel
                issues={issues}
                issueStatuses={issueStatuses}
                activeFilter={activeFilter}
                onAcceptIssue={handleAcceptIssue}
                onRejectIssue={handleRejectIssue}
                onUndoIssue={handleUndoIssue}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
                onResetAll={handleResetAll}
              />
            )}
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>সংবাদ শুদ্ধি</strong> — পেশাদার বাংলা সংবাদপত্র সম্পাদনা ও নিরীক্ষা ব্যবস্থা
          </span>
          <span className="text-[11px] text-slate-400">
            বাংলা একাডেমি প্রমিত বানানরীতি ও শীর্ষ জাতীয় দৈনিকসমূহের প্রেস স্ট্যান্ডার্ড অনুযায়ী নির্মিত
          </span>
        </div>
      </footer>
    </div>
  );
}

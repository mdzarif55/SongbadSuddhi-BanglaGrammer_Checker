'use client';

import React from 'react';
import {
  CheckCheck,
  XCircle,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { Issue, IssueCategory } from '@/types/proofreading';
import { IssueCard } from './IssueCard';

interface IssuePanelProps {
  issues: Issue[];
  issueStatuses: Record<string, 'pending' | 'accepted' | 'rejected'>;
  activeFilter: IssueCategory | 'all';
  onAcceptIssue: (issue: Issue) => void;
  onRejectIssue: (issue: Issue) => void;
  onUndoIssue: (issue: Issue) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onResetAll: () => void;
}

export const IssuePanel: React.FC<IssuePanelProps> = ({
  issues,
  issueStatuses,
  activeFilter,
  onAcceptIssue,
  onRejectIssue,
  onUndoIssue,
  onAcceptAll,
  onRejectAll,
  onResetAll,
}) => {
  // Filtered issues
  const filtered = issues.filter((issue) => {
    if (activeFilter === 'all') return true;
    return issue.category === activeFilter;
  });

  const pendingCount = issues.filter(
    (i) => (issueStatuses[i.id] || 'pending') === 'pending'
  ).length;

  const acceptedCount = issues.filter(
    (i) => issueStatuses[i.id] === 'accepted'
  ).length;

  const rejectedCount = issues.filter(
    (i) => issueStatuses[i.id] === 'rejected'
  ).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header & Batch Actions */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              চিহ্নিত বিষয়সমূহ ({filtered.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              গৃহীত: {acceptedCount}
            </span>
            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              বাকি: {pendingCount}
            </span>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAcceptAll}
              disabled={pendingCount === 0}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-40"
              title="সবগুলো প্রস্তাবনা একবারে গ্রহণ করুন"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              সবগুলো গ্রহণ
            </button>

            <button
              type="button"
              onClick={onRejectAll}
              disabled={pendingCount === 0}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 disabled:opacity-40"
              title="সবগুলো প্রস্তাবনা বাতিল করুন"
            >
              <XCircle className="w-3.5 h-3.5" />
              সবগুলো বাতিল
            </button>
          </div>

          <button
            type="button"
            onClick={onResetAll}
            disabled={acceptedCount === 0 && rejectedCount === 0}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30"
            title="সকল পরিবর্তন রিসেট করে মূল খসড়ায় ফিরুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            রিসেট
          </button>
        </div>
      </div>

      {/* Issues Scrollable List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[600px]">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
            <p className="text-xs font-medium text-slate-600">
              এই বিভাগে কোনো ত্রুটি বা প্রস্তাবনা নেই।
            </p>
          </div>
        ) : (
          filtered.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              status={issueStatuses[issue.id] || 'pending'}
              onAccept={onAcceptIssue}
              onReject={onRejectIssue}
              onUndo={onUndoIssue}
            />
          ))
        )}
      </div>
    </div>
  );
};

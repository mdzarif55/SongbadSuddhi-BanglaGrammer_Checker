'use client';

import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  SpellCheck,
  BookA,
  Quote,
  Feather,
  Eye,
  AlertOctagon,
} from 'lucide-react';
import { AnalysisSummary as SummaryType, IssueCategory } from '@/types/proofreading';

interface AnalysisSummaryProps {
  summary: SummaryType;
  selectedFilter: IssueCategory | 'all';
  onFilterChange: (filter: IssueCategory | 'all') => void;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  selectedFilter,
  onFilterChange,
}) => {
  const isClean = summary.totalIssues === 0;

  const categories: {
    id: IssueCategory;
    label: string;
    count: number;
    icon: React.ReactNode;
    color: string;
    activeBg: string;
  }[] = [
    {
      id: 'spelling',
      label: 'বানান',
      count: summary.spellingCount,
      icon: <SpellCheck className="w-3.5 h-3.5" />,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      activeBg: 'bg-rose-600 text-white border-rose-600',
    },
    {
      id: 'grammar',
      label: 'ব্যাকরণ',
      count: summary.grammarCount,
      icon: <BookA className="w-3.5 h-3.5" />,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      activeBg: 'bg-amber-600 text-white border-amber-600',
    },
    {
      id: 'punctuation',
      label: 'বিরামচিহ্ন',
      count: summary.punctuationCount,
      icon: <Quote className="w-3.5 h-3.5" />,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      activeBg: 'bg-indigo-600 text-white border-indigo-600',
    },
    {
      id: 'style',
      label: 'সংবাদশৈলী',
      count: summary.styleCount,
      icon: <Feather className="w-3.5 h-3.5" />,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      activeBg: 'bg-blue-600 text-white border-blue-600',
    },
    {
      id: 'clarity',
      label: 'স্পষ্টতা',
      count: summary.clarityCount,
      icon: <Eye className="w-3.5 h-3.5" />,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      activeBg: 'bg-teal-600 text-white border-teal-600',
    },
    {
      id: 'editorial_warning',
      label: 'সম্পাদকীয় যাচাই',
      count: summary.editorialWarningCount,
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      activeBg: 'bg-orange-600 text-white border-orange-600',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isClean
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isClean ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isClean ? 'লেখাটিতে কোনো দৃশ্যমান ত্রুটি পাওয়া যায়নি' : `মোট ${summary.totalIssues} টি নিরীক্ষা ও সংশোধন প্রস্তাবনা`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {summary.summaryBengali}
            </p>
          </div>
        </div>

        {/* Total Badge */}
        <div className="self-end sm:self-center px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
          রীতি: {summary.editorialStyle === 'bangla_academy' ? 'বাংলা একাডেমি' : 'আধুনিক প্রেস'}
        </div>
      </div>

      {/* Editorial Warnings List (if any) */}
      {summary.editorialWarnings && summary.editorialWarnings.length > 0 && (
        <div className="bg-orange-50/70 border border-orange-200 rounded-lg p-3 space-y-1">
          <span className="text-[11px] font-bold text-orange-900 flex items-center gap-1.5 uppercase tracking-wide">
            <AlertOctagon className="w-3.5 h-3.5 text-orange-600" />
            সম্পাদকীয় যাচাইয়ের বিষয়সমূহ:
          </span>
          <ul className="text-xs text-orange-800 list-disc list-inside space-y-0.5">
            {summary.editorialWarnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Pills Filter */}
      <div className="flex items-center flex-wrap gap-2 pt-1">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
            selectedFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          সবগুলো ({summary.totalIssues})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onFilterChange(cat.id)}
            disabled={cat.count === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              selectedFilter === cat.id
                ? cat.activeBg
                : cat.count > 0
                ? `${cat.color} hover:opacity-90`
                : 'opacity-40 bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedFilter === cat.id ? 'bg-white/20' : 'bg-black/5'
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

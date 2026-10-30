'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  Check,
  Split,
  FileCheck,
  Eye,
  GitCompare,
} from 'lucide-react';
import { computeEditorialDiff } from '@/lib/correction/apply-corrections';

interface ArticleComparisonProps {
  originalText: string;
  correctedText: string;
  title?: string;
}

export const ArticleComparison: React.FC<ArticleComparisonProps> = ({
  originalText,
  correctedText,
  title,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'diff' | 'side-by-side'>('preview');
  const [copied, setCopied] = useState(false);

  const diffChunks = computeEditorialDiff(originalText, correctedText);

  const handleCopy = async () => {
    try {
      const fullExport = title ? `${title}\n\n${correctedText}` : correctedText;
      await navigator.clipboard.writeText(fullExport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownload = () => {
    const fullExport = title ? `${title}\n\n${correctedText}` : correctedText;
    const blob = new Blob([fullExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shangbad-shuddhi-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Top Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            সংশোধিত রূপ
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
            পরিবর্তন ডিআইএফএফ
          </button>

          <button
            onClick={() => setActiveTab('side-by-side')}
            className={`hidden md:flex px-3 py-1 text-xs font-semibold rounded-md transition-all items-center gap-1.5 ${
              activeTab === 'side-by-side'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Split className="w-3.5 h-3.5 text-slate-600" />
            পাশাপাশি তুলনা
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="ডাউনলোড করুন (.txt)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                কপি সম্পন্ন!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                সংশোধিত লেখা কপি করুন
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 overflow-y-auto min-h-[350px] max-h-[600px] font-bengali text-slate-800 leading-relaxed">
        {title && (
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            {title}
          </h2>
        )}

        {/* 1. Preview Mode */}
        {activeTab === 'preview' && (
          <div className="whitespace-pre-wrap text-base font-normal">
            {correctedText}
          </div>
        )}

        {/* 2. Visual Diff Mode */}
        {activeTab === 'diff' && (
          <div className="whitespace-pre-wrap text-base leading-loose font-normal">
            {diffChunks.map((chunk, i) => {
              if (chunk.type === 'removed') {
                return (
                  <span
                    key={i}
                    className="bg-rose-100 text-rose-800 line-through decoration-rose-600 px-1 py-0.5 rounded mx-0.5 font-medium"
                    title="বর্জিত অংশ"
                  >
                    {chunk.value}
                  </span>
                );
              }
              if (chunk.type === 'added') {
                return (
                  <span
                    key={i}
                    className="bg-emerald-100 text-emerald-900 font-bold px-1 py-0.5 rounded mx-0.5 border border-emerald-300"
                    title="সংযোজিত/শুদ্ধ রূপ"
                  >
                    {chunk.value}
                  </span>
                );
              }
              return <span key={i}>{chunk.value}</span>;
            })}
          </div>
        )}

        {/* 3. Side-by-Side Mode */}
        {activeTab === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4 h-full text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                মূল অপ্রমিত খসড়া
              </h4>
              <div className="whitespace-pre-wrap text-slate-700">{originalText}</div>
            </div>

            <div className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-200 overflow-y-auto">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                প্রমিত সংশোধিত সংবাদ
              </h4>
              <div className="whitespace-pre-wrap text-slate-900 font-medium">
                {correctedText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


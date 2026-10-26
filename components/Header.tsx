'use client';

import React, { useState } from 'react';
import {
  Newspaper,
  BookOpen,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { EditorialStyle, EditorialPreset } from '@/types/proofreading';
import { SAMPLE_ARTICLES } from '@/lib/presets/sample-articles';
import { DictionaryInfoModal } from './DictionaryInfoModal';

interface HeaderProps {
  editorialStyle: EditorialStyle;
  onStyleChange: (style: EditorialStyle) => void;
  onSelectPreset: (preset: EditorialPreset) => void;
  isAiActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  editorialStyle,
  onStyleChange,
  onSelectPreset,
  isAiActive,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-emerald-400 shadow-md border border-slate-700">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    সংবাদ শুদ্ধি
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    নিউজরুম সংস্করণ
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 tracking-wide">
                  Bangla Newsroom Proofreader
                </p>
              </div>
            </div>

            {/* Middle / Right Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Presets Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                >
                  <span className="hidden md:inline">নমুনা সংবাদ</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {presetDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setPresetDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      নমুনা সংবাদ প্রতিবেদন নির্বাচন করুন
                    </div>
                    {SAMPLE_ARTICLES.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectPreset(preset);
                          setPresetDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col"
                      >
                        <span className="font-medium text-slate-800">{preset.title}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Style Selector */}
              <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => onStyleChange('bangla_academy')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    editorialStyle === 'bangla_academy'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="বাংলা একাডেমি প্রমিত বানানরীতি"
                >
                  বাংলা একাডেমি
                </button>
                <button
                  onClick={() => onStyleChange('modern_newsroom')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    editorialStyle === 'modern_newsroom'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="আধুনিক শীর্ষ দৈনিকের প্রেস স্টাইল"
                >
                  আধুনিক প্রেস
                </button>
              </div>

              {/* Engine Status Indicators */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="অভিধান ও বানান ইঞ্জিন তথ্য দেখতে ক্লিক করুন"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">অভিধান</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  isAiActive
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  isAiActive
                    ? 'Google Gemini AI সক্রিয়'
                    : 'স্থানীয় প্রেস নিয়ম ও অভিধান মোড'
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">
                  {isAiActive ? 'Gemini AI' : 'প্রেস লেক্সিকন'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dictionary Info Modal */}
      <DictionaryInfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

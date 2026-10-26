'use client';

import React from 'react';
import { X, BookOpen, ShieldCheck, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';
import dictionaryData from '@/data/bengali_news_dictionary.json';

interface DictionaryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DictionaryInfoModal: React.FC<DictionaryInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-semibold">বাংলা অভিধান ও বানান ভাণ্ডার তথ্য</h3>
              <p className="text-xs text-slate-300">
                সংবাদ শুদ্ধি লেক্সিকন ইঞ্জিন (সংস্করণ: {dictionaryData.metadata.version})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="block text-xs text-slate-500 font-medium">লাইসেন্স</span>
              <span className="font-semibold text-slate-900">{dictionaryData.metadata.license}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 font-medium">প্রমিত শব্দ ও নিয়ম</span>
              <span className="font-semibold text-emerald-700">
                {dictionaryData.metadata.totalEntries} টি যাচাইকৃত এন্ট্রি
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 font-medium">স্ট্যান্ডার্ড</span>
              <span className="font-semibold text-slate-900">বাংলা একাডেমি প্রমিত</span>
            </div>
          </div>

          {/* Transparency Disclaimer */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900">স্বচ্ছতা ঘোষণা (Honest Transparency)</h4>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  এই অভিধানটি বাংলা একাডেমির সম্পূর্ণ ১৫ খণ্ডের মুদ্রণ অভিধানের পূর্ণাঙ্গ ডিজিটাল প্রতিরূপ নয়। 
                  এটি বাংলাদেশের জাতীয় দৈনিকসমূহের উচ্চ-ফ্রিকোয়েন্সি শব্দ, সাধারণ মুদ্রণ প্রমাদ ও ব্যাকরণিক অসঙ্গতি 
                  নির্ণয়ের জন্য বিশেষভাবে সংকলিত একটি প্রতিস্থাপনযোগ্য (replaceable) প্রেস লেক্সিকন ইঞ্জিন।
                </p>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ইঞ্জিনের মূল সুবিধাসমূহ
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>ইউনিকোড এনএফসি (NFC) নরমালাইজেশন:</strong> বাংলা যুক্তবর্ণ, হসন্ত ও নুকতা গঠিত বর্ণগুলোকে প্রমিত আকারে সাজায়।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>সংরক্ষিত উপাদান সুরক্ষা:</strong> জেলা, সাংবিধানিক পদ, প্রতিষ্ঠান ও বিশিষ্ট ব্যক্তিদের নাম কখনো বিকৃত করা হয় না।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>লেভেনস্টাইন ও ফোনেটিক পরামর্শ:</strong> শ/ষ/স, ণ/ন, র/ড় এবং ই/ঈ বিভ্রান্তি দূরীকরণে বিকল্প প্রমিত বানানের প্রস্তাব।
                </span>
              </li>
            </ul>
          </div>

          {/* Custom dictionary instructions */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-lg">
            <h4 className="font-semibold text-emerald-400 text-xs mb-1 flex items-center gap-1.5">
              <FileCode className="w-4 h-4" />
              বৃহত্তর বা কাস্টম শব্দভাণ্ডার সংযুক্ত করার নিয়ম
            </h4>
            <p className="text-[11px] text-slate-300 mb-2">
              আপনার নিউজরুমের নিজস্ব পরিভাষা বা উন্মুক্ত বাংলা শব্দকোষ (Mozilla/Ankur) যুক্ত করতে নিচের কমান্ডটি ব্যবহার করুন:
            </p>
            <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-teal-300 select-all overflow-x-auto">
              node scripts/import-dictionary.mjs --source path/to/wordlist.txt
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

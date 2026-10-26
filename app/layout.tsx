import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'সংবাদ শুদ্ধি — Bangla Newsroom Proofreader',
  description:
    'বাংলাদেশের সংবাদপত্রের সাংবাদিক ও সহ-সম্পাদকদের জন্য প্রমিত বাংলা বানান, ব্যাকরণ ও সম্পাদকীয় নিরীক্ষা প্ল্যাটফর্ম।',
  keywords: [
    'Bangla Proofreader',
    'Bengali Newspaper Editing',
    'সংবাদ শুদ্ধি',
    'বাংলা বানান পরীক্ষা',
    'বাংলা ব্যাকরণ',
    'বাংলা একাডেমি প্রমিত বানান',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900 font-bengali">
        {children}
      </body>
    </html>
  );
}

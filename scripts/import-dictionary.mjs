/**
 * Bengali Lexicon Import Script
 * Reads plain-text Bengali wordlists or dictionary json, normalizes to NFC, and outputs updated dictionary.
 * Usage: node scripts/import-dictionary.mjs --source <path-to-txt-or-json>
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const sourceIdx = args.indexOf('--source');
const sourceFile = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

if (!sourceFile) {
  console.log('Usage: node scripts/import-dictionary.mjs --source <file-path>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), sourceFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found at ${resolvedPath}`);
  process.exit(1);
}

console.log(`Processing vocabulary from: ${resolvedPath}...`);
const raw = fs.readFileSync(resolvedPath, 'utf-8');
const lines = raw.split(/\r?\n/).map((l) => l.trim().normalize('NFC')).filter(Boolean);

console.log(`Extracted ${lines.length} lines. Validating Bengali character tokens...`);

const targetJsonPath = path.resolve(process.cwd(), 'data/bengali_news_dictionary.json');
let existing = {
  metadata: {
    name: "Bangla Newsroom Proofreader Standard Lexicon",
    version: "1.1.0",
    updated: new Date().toISOString().split('T')[0],
    license: "MIT / CC-BY-SA 4.0",
    description: "Curated journalistic vocabulary conforming to Bangla Academy norms.",
    totalEntries: 0
  },
  misspellings: [],
  editorialRules: [],
  protectedEntities: [],
  standardWords: []
};

if (fs.existsSync(targetJsonPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(targetJsonPath, 'utf-8'));
  } catch (e) {
    console.warn('Could not parse existing dictionary, generating fresh dictionary.');
  }
}

const wordSet = new Set(existing.standardWords || []);
let addedCount = 0;
const bengaliRegex = /^[\u0980-\u09FF]+$/;

for (const line of lines) {
  if (bengaliRegex.test(line) && !wordSet.has(line)) {
    wordSet.add(line);
    addedCount++;
  }
}

existing.standardWords = Array.from(wordSet);
existing.metadata.totalEntries = existing.standardWords.length + (existing.misspellings?.length || 0);
existing.metadata.updated = new Date().toISOString().split('T')[0];

fs.writeFileSync(targetJsonPath, JSON.stringify(existing, null, 2), 'utf-8');
console.log(`Success! Added ${addedCount} new words. Total entries: ${existing.metadata.totalEntries}`);

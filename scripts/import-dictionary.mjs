/**
 * Bengali Lexicon Import Script
 * Reads plain-text Bengali wordlists or dictionary json, normalizes to NFC, and outputs updated dictionary.
 * Usage: node scripts/import-dictionary.mjs --source <path-to-txt-or-json>
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

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

const targetJsonPath = path.resolve(process.cwd(), 'data/bengali_news_dictionary.json');
const targetMetaPath = path.resolve(process.cwd(), 'data/dictionary_meta.json');

let existing = {
  metadata: {
    name: "Bangla Newsroom Proofreader Standard Lexicon",
    version: "2.0.0",
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
let initialCount = wordSet.size;
let addedCount = 0;
const bengaliRegex = /^[\u0980-\u09FF\u200C\u200D]+$/;

async function processFile() {
  const fileStream = fs.createReadStream(resolvedPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const word = line.trim().normalize('NFC').replace(/^\uFEFF/, '');
    if (word && bengaliRegex.test(word) && !wordSet.has(word)) {
      wordSet.add(word);
      addedCount++;
    }
  }

  console.log(`Extracted and normalized words. Added: ${addedCount} new words.`);

  existing.standardWords = Array.from(wordSet);
  existing.metadata.totalEntries = existing.standardWords.length + (existing.misspellings?.length || 0);
  existing.metadata.updated = new Date().toISOString().split('T')[0];
  existing.metadata.version = "2.0.0";

  // Write metadata file for lightweight client consumption
  fs.writeFileSync(targetMetaPath, JSON.stringify(existing.metadata, null, 2), 'utf-8');

  // Write full dictionary
  fs.writeFileSync(targetJsonPath, JSON.stringify(existing), 'utf-8');

  console.log(`Success! Total dictionary entries: ${existing.metadata.totalEntries}`);
}

processFile().catch(console.error);

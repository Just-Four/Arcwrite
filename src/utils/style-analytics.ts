"use client";

export type StyleMetrics = {
  words: number;
  sentences: number;
  avgSentenceLength: number; // words per sentence
  sentenceLengthStd: number;
  lexicalDensity: number; // 0..1
  punctuationRate: number; // punctuation chars per 100 words
  dialoguePercent: number; // 0..100
  shortSentenceRatio: number; // 0..1
  commonBigrams: string[];
};

const stopwords = new Set([
  "the","a","an","and","or","but","if","than","then","so","because","as","of","in","on","at","to","from","by","with",
  "for","is","are","was","were","be","been","being","it","its","this","that","these","those","i","you","he","she","they",
  "we","me","him","her","them","my","your","his","her","their","our","mine","yours","hers","theirs","ours","not","no",
  "do","does","did","doing","have","has","had","having","will","would","should","could","can","may","might","must",
]);

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  // Split by ., !, ?, or line breaks as sentence boundaries
  const parts = cleaned.split(/(?<=[\.!?])\s+|\n+/g).map(s => s.trim()).filter(Boolean);
  return parts;
}

function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[a-zA-Z’'’-]+/g);
  return m ? m : [];
}

function wordsPerSentence(sentences: string[]): number[] {
  return sentences.map(s => tokenize(s).length);
}

function stddev(nums: number[]): number {
  if (nums.length === 0) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / nums.length;
  return Math.sqrt(variance);
}

function lexicalDensity(words: string[]): number {
  if (words.length === 0) return 0;
  const content = words.filter(w => w.length > 3 && !stopwords.has(w));
  return content.length / words.length;
}

function punctuationRate(text: string, wordsCount: number): number {
  if (wordsCount === 0) return 0;
  const puncts = (text.match(/[,:;—–\-…\(\)\[\]"“”'’]/g) || []).length;
  return (puncts / wordsCount) * 100;
}

function dialoguePercent(text: string): number {
  const lines = text.split(/\n/g);
  if (lines.length === 0) return 0;
  const dialogueLines = lines.filter(l => /(^["“'])|(["”']$)|(^- )|(:\s*["“'])/.test(l.trim())).length;
  const quotedChars = (text.match(/["“”'’]/g) || []).length;
  // Heuristic combining lines with quotes and total quotes
  const base = (dialogueLines / lines.length) * 100;
  const bonus = Math.min(quotedChars / Math.max(lines.length, 1), 10); // cap bonus
  return Math.min(base + bonus, 100);
}

function bigrams(words: string[], topN = 10): string[] {
  const freqs = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`;
    const prev = freqs.get(bg) || 0;
    freqs.set(bg, prev + 1);
  }
  return Array.from(freqs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
}

export function analyzeText(text: string): StyleMetrics {
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const wps = wordsPerSentence(sentences);
  const avg = wps.length ? wps.reduce((a, b) => a + b, 0) / wps.length : 0;
  const std = stddev(wps);
  const ld = lexicalDensity(words);
  const pr = punctuationRate(text, words.length);
  const dp = dialoguePercent(text);
  const shortRatio = wps.length ? wps.filter(n => n <= 10).length / wps.length : 0;
  const bgs = bigrams(words);

  return {
    words: words.length,
    sentences: sentences.length,
    avgSentenceLength: avg,
    sentenceLengthStd: std,
    lexicalDensity: ld,
    punctuationRate: pr,
    dialoguePercent: dp,
    shortSentenceRatio: shortRatio,
    commonBigrams: bgs,
  };
}

export function extractExamples(text: string, maxExamples = 3): string[] {
  // Choose mid-length paragraphs as few-shot style references
  const paras = text
    .split(/\n{2,}/g)
    .map(p => p.trim())
    .filter(p => p.length >= 120 && p.length <= 800);
  if (paras.length === 0) {
    // fallback: chunk by sentences
    const sents = splitSentences(text);
    const joined = [];
    let chunk = "";
    for (const s of sents) {
      chunk += (chunk ? " " : "") + s;
      if (chunk.length >= 140) {
        joined.push(chunk);
        chunk = "";
      }
    }
    if (chunk) joined.push(chunk);
    return joined.slice(0, maxExamples);
  }
  return paras.slice(0, maxExamples);
}

export function toneDrift(current: StyleMetrics, baseline?: StyleMetrics): number {
  if (!baseline) return 0;
  // Normalize differences across key metrics
  const d1 = Math.min(Math.abs(current.avgSentenceLength - baseline.avgSentenceLength) / 30, 1);
  const d2 = Math.min(Math.abs(current.lexicalDensity - baseline.lexicalDensity), 1);
  const d3 = Math.min(Math.abs(current.dialoguePercent - baseline.dialoguePercent) / 100, 1);
  const d4 = Math.min(Math.abs(current.shortSentenceRatio - baseline.shortSentenceRatio), 1);
  const score = (d1 * 0.35 + d2 * 0.25 + d3 * 0.2 + d4 * 0.2) * 100;
  return Math.round(score);
}

export function styleSummary(metrics: StyleMetrics): string {
  const rhythm =
    metrics.avgSentenceLength < 12
      ? "staccato pacing with concise sentences"
      : metrics.avgSentenceLength < 18
      ? "balanced pacing with varied sentence lengths"
      : "flowing pacing with longer, descriptive sentences";
  return [
    `Average sentence length: ${metrics.avgSentenceLength.toFixed(1)} words (std ${metrics.sentenceLengthStd.toFixed(1)}).`,
    `Lexical density: ${(metrics.lexicalDensity * 100).toFixed(0)}%.`,
    `Dialogue presence: ${metrics.dialoguePercent.toFixed(0)}%.`,
    `Punctuation rate: ${metrics.punctuationRate.toFixed(1)} per 100 words.`,
    `Overall rhythm: ${rhythm}.`,
  ].join(" ");
}
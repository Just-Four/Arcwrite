"use client";

import * as React from "react";
import { analyzeText, extractExamples, StyleMetrics, styleSummary } from "@/utils/style-analytics";

export type StyleSample = {
  id: string;
  title: string;
  text: string;
  metrics: StyleMetrics;
};

export type StyleProfile = {
  samples: StyleSample[];
  aggregated?: StyleMetrics;
};

const STORAGE_KEY = "arcwright_style_profile";

function aggregateMetrics(samples: StyleSample[]): StyleMetrics | undefined {
  if (samples.length === 0) return undefined;
  // Weighted average by words
  const totalWords = samples.reduce((s, x) => s + x.metrics.words, 0) || 1;
  const sum = samples.reduce(
    (acc, s) => {
      const w = s.metrics.words / totalWords;
      acc.avgSentenceLength += s.metrics.avgSentenceLength * w;
      acc.sentenceLengthStd += s.metrics.sentenceLengthStd * w;
      acc.lexicalDensity += s.metrics.lexicalDensity * w;
      acc.punctuationRate += s.metrics.punctuationRate * w;
      acc.dialoguePercent += s.metrics.dialoguePercent * w;
      acc.shortSentenceRatio += s.metrics.shortSentenceRatio * w;
      return acc;
    },
    {
      avgSentenceLength: 0,
      sentenceLengthStd: 0,
      lexicalDensity: 0,
      punctuationRate: 0,
      dialoguePercent: 0,
      shortSentenceRatio: 0,
    },
  );
  return {
    words: totalWords,
    sentences: samples.reduce((s, x) => s + x.metrics.sentences, 0),
    avgSentenceLength: sum.avgSentenceLength,
    sentenceLengthStd: sum.sentenceLengthStd,
    lexicalDensity: sum.lexicalDensity,
    punctuationRate: sum.punctuationRate,
    dialoguePercent: sum.dialoguePercent,
    shortSentenceRatio: sum.shortSentenceRatio,
    commonBigrams: [], // not used in aggregate display
  };
}

export function useStyleModel() {
  const [profile, setProfile] = React.useState<StyleProfile>({ samples: [] });

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StyleProfile;
        setProfile(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const addSample = (text: string, title = "Sample") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const metrics = analyzeText(trimmed);
    const sample: StyleSample = {
      id: crypto.randomUUID(),
      title,
      text: trimmed,
      metrics,
    };
    const next = { samples: [...profile.samples, sample] };
    next.aggregated = aggregateMetrics(next.samples);
    setProfile(next);
  };

  const removeSample = (id: string) => {
    const next = { samples: profile.samples.filter(s => s.id !== id) };
    next.aggregated = aggregateMetrics(next.samples);
    setProfile(next);
  };

  const clearSamples = () => {
    setProfile({ samples: [], aggregated: undefined });
  };

  const getStylePrompt = (): string => {
    if (!profile.aggregated || profile.samples.length === 0) {
      return "Match the user's voice: clear, authentic, and consistent. Preserve meaning and personal tone.";
    }
    const summary = styleSummary(profile.aggregated);
    const examples = profile.samples
      .slice(-3)
      .flatMap(s => extractExamples(s.text, 1))
      .map((ex, i) => `Example ${i + 1}:\n${ex}`)
      .join("\n\n");

    return [
      "Rewrite to match the user's personal voice. Keep the original meaning, facts, and intent.",
      summary,
      "Mimic sentence rhythm, lexical density, and dialogue style. Avoid generic phrasing.",
      "Use contractions and punctuation consistent with the user's style.",
      "Here are style examples:",
      examples,
    ].join("\n\n");
  };

  return {
    profile,
    addSample,
    removeSample,
    clearSamples,
    getStylePrompt,
  };
}

export default useStyleModel;
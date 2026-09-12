"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { analyzeText, toneDrift, StyleMetrics } from "@/utils/style-analytics";
import { StyleProfile } from "@/hooks/use-style-model";
import { useArcwright } from "@/hooks/use-arcwright";

type Props = {
  content: string;
  profile?: StyleProfile;
};

const StyleMeter: React.FC<Props> = ({ content, profile }) => {
  const { currentSceneId, sceneMetrics } = useArcwright();
  const sceneMetric = currentSceneId ? sceneMetrics[currentSceneId] : undefined;

  const liveMetrics = React.useMemo<StyleMetrics>(() => analyzeText(content ?? ""), [content]);

  const metricsForDisplay = sceneMetric
    ? {
        avgSentenceLength: sceneMetric.avgSentenceLength,
        shortSentenceRatio: sceneMetric.shortSentenceRatio,
        dialoguePercent: sceneMetric.dialoguePercent,
      }
    : liveMetrics;

  const drift = toneDrift(metricsForDisplay, profile?.aggregated);

  const items = [
    {
      label: "Sentence length",
      value: Math.min((metricsForDisplay.avgSentenceLength / 30) * 100, 100),
      hint: `${metricsForDisplay.avgSentenceLength.toFixed(1)} words`,
    },
    {
      label: "Pacing (short ratio)",
      value: Math.min(metricsForDisplay.shortSentenceRatio * 100, 100),
      hint: `${Math.round(metricsForDisplay.shortSentenceRatio * 100)}%`,
    },
    {
      label: "Tone drift",
      value: drift,
      hint: `${drift}%`,
    },
    {
      label: "Dialogue %",
      value: Math.min(metricsForDisplay.dialoguePercent, 100),
      hint: `${metricsForDisplay.dialoguePercent.toFixed(0)}%`,
    },
  ];

  return (
    <div className="w-64 rounded-md border bg-muted/30 p-3">
      <div className="text-xs font-semibold mb-2">Style meter</div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex justify-between text-[11px] mb-1">
              <span>{it.label}</span>
              <span className="text-muted-foreground">{it.hint}</span>
            </div>
            <Progress value={it.value} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StyleMeter;
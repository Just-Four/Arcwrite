"use client";

import * as React from "react";
import { useArcwright } from "@/hooks/use-arcwright";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts";
import { getFrameworkById, parseStepId, getActIndexForStep } from "@/lib/framework-library";
import { analyzeText } from "@/utils/style-analytics";
import { useAI } from "@/hooks/use-ai";
import { Link } from "react-router-dom";

type SceneMetric = {
  id: string;
  title: string;
  words: number;
  avgSentenceLength: number;
  dialogueRatio: number; // percentage of lines starting with quotes/dashes
  toneScore: number; // 0..100 lightweight sentiment
};

function computeDialogueRatio(text: string): number {
  const lines = text.split(/\n/g).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return 0;
  const dialogueLines = lines.filter(l => /^["“”'’\-]/.test(l)).length;
  return Math.round((dialogueLines / lines.length) * 100);
}

function computeToneScore(text: string): number {
  const pos = (text.match(/\b(good|joy|love|hope|win|calm|happy|kind|light)\b/gi) || []).length;
  const neg = (text.match(/\b(bad|hate|fear|loss|sad|angry|pain|dark|storm)\b/gi) || []).length;
  return Math.max(0, Math.min(100, Math.round(((pos + 1) / (neg + 1)) * 50)));
}

function toneColor(score: number): string {
  // Map sentiment to discrete colors: red (negative), yellow (neutral), green (positive)
  const s = Math.max(0, Math.min(100, score));
  if (s < 40) return "hsl(0 80% 50%)";        // negative -> red
  if (s < 60) return "hsl(45 90% 50%)";       // neutral -> yellow
  return "hsl(140 70% 40%)";                  // positive -> green
}

const ActReview: React.FC = () => {
  const { currentBook, sceneMetrics } = useArcwright();
  const { settings, chat } = useAI();

  const fw = currentBook?.frameworkId ? getFrameworkById(currentBook.frameworkId) : undefined;

  const allScenes = React.useMemo(() => {
    if (!currentBook) return [];
    return currentBook.chapters.flatMap(ch =>
      (ch.scenes ?? []).map(sc => ({
        ...sc,
        chapterTitle: ch.title,
      })),
    );
  }, [currentBook]);

  const actsData = React.useMemo(() => {
    if (!fw) return [];
    const actsCount = fw.acts.length;
    const acts: {
      actIndex: number;
      actName: string;
      scenes: { id: string; title: string; content: string; stepId?: string }[];
      metrics: SceneMetric[];
      stepCoverage: { stepIndex: number; title: string; count: number }[];
    }[] = [];

    for (let i = 0; i < actsCount; i++) {
      const scenesInAct = allScenes.filter(sc => {
        const parsed = sc.stepId ? parseStepId(sc.stepId) : undefined;
        if (!parsed || parsed.frameworkId !== fw.id) return false;
        const actIdx = getActIndexForStep(fw.id, parsed.index);
        return actIdx === i;
      });

      const metrics: SceneMetric[] = scenesInAct.map(sc => {
        const existing = sceneMetrics?.[sc.id];
        const content = sc.content ?? "";
        const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
        const analyzed = analyzeText(content);
        const avgSentenceLength = analyzed.avgSentenceLength;
        const dialogueRatio = computeDialogueRatio(content);
        const toneScore = computeToneScore(content);
        return {
          id: sc.id,
          title: sc.title,
          words: existing?.wordCount ?? words,
          avgSentenceLength: existing?.avgSentenceLength ?? avgSentenceLength,
          dialogueRatio: existing?.dialoguePercent ?? dialogueRatio,
          toneScore: existing?.toneScore ?? toneScore,
        };
      });

      // Step coverage for this act
      const stepsInAct = fw.steps
        .map((s, idx) => ({ s, idx }))
        .filter(({ idx }) => getActIndexForStep(fw.id, idx) === i);
      const coverage = stepsInAct.map(({ s, idx }) => {
        const stepScenes = scenesInAct.filter(sc => {
          const parsed = sc.stepId ? parseStepId(sc.stepId) : undefined;
          return parsed && parsed.frameworkId === fw.id && parsed.index === idx;
        });
        return { stepIndex: idx, title: s.title, count: stepScenes.length };
      });

      acts.push({
        actIndex: i,
        actName: fw.acts[i],
        scenes: scenesInAct.map(sc => ({ id: sc.id, title: sc.title, content: sc.content ?? "", stepId: sc.stepId })),
        metrics,
        stepCoverage: coverage,
      });
    }

    return acts;
  }, [fw, allScenes, sceneMetrics]);

  const [summaries, setSummaries] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (!fw) return;
    // Only generate if AI settings are available (BYOK with apiKey or managed mode)
    const canGenerate =
      settings.mode === "managed" ||
      (settings.mode !== "managed" && typeof settings.apiKey === "string" && settings.apiKey.length > 0);
    if (!canGenerate) return;

    actsData.forEach(async (act) => {
      if (act.metrics.length === 0) return;
      if (summaries[act.actIndex]) return;

      const stepsInAct = fw.steps
        .map((s, idx) => ({ s, idx }))
        .filter(({ idx }) => getActIndexForStep(fw.id, idx) === act.actIndex);

      const input = [
        `Framework: ${fw.name}`,
        `Act: ${act.actName}`,
        `Steps in this act:`,
        ...stepsInAct.map(({ s, idx }) => `- ${idx + 1}. ${s.title}: ${s.purpose}`),
        `Scenes and metrics:`,
        ...act.metrics.map((m, i) => `Scene ${i + 1} "${m.title}": words=${m.words}, avgSentenceLen=${m.avgSentenceLength.toFixed(1)}, dialogueRatio=${m.dialogueRatio}%, toneScore=${m.toneScore}`),
        `Coverage:`,
        ...act.stepCoverage.map(c => `- ${fw.steps[c.stepIndex].title}: ${c.count} scene(s)`),
      ].join("\n");

      const messages = [
        {
          role: "system" as const,
          content:
            "You are a concise story structure analyst. Summarize act pacing, tone, dialogue, and step coverage, then provide insights and suggestions. Keep it under 150 words.",
        },
        { role: "user" as const, content: input },
      ];

      const content = await chat(messages);
      setSummaries((prev) => ({ ...prev, [act.actIndex]: content }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actsData, fw, settings.mode, settings.apiKey]);

  if (!currentBook) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Act Review</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            No book selected. Go back and open a project to review acts.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!fw) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Act Review</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Back to Editor</Link>
            </Button>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This project has no framework selected. Choose one in the Structure panel to enable Act Review.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Act Review: {currentBook.title}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to Editor</Link>
        </Button>
      </div>

      {actsData.map((act) => {
        // Use scene titles for chart labels
        const pacingData = act.metrics.map((m) => ({ title: m.title, words: m.words }));
        const dialogueData = act.metrics.map((m) => ({ title: m.title, dialogue: m.dialogueRatio }));

        const maxCoverage = Math.max(1, ...act.stepCoverage.map(c => c.count));

        return (
          <Card key={act.actIndex}>
            <CardHeader>
              <CardTitle>{act.actName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {act.metrics.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No scenes in this act yet. Use this space to plan upcoming beats.
                </div>
              ) : (
                <>
                  {/* Charts grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pacing: line graph of word counts */}
                    <div>
                      <div className="text-sm mb-2 font-medium">Pacing (Word Count)</div>
                      <ChartContainer
                        config={{
                          words: { label: "Words", color: "hsl(var(--primary))" },
                        }}
                        className="h-56 w-full"
                      >
                        <LineChart data={pacingData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="title" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="words" stroke="var(--color-words)" dot />
                        </LineChart>
                      </ChartContainer>
                    </div>

                    {/* Dialogue ratio: bar chart */}
                    <div>
                      <div className="text-sm mb-2 font-medium">Dialogue Ratio (%)</div>
                      <ChartContainer
                        config={{
                          dialogue: { label: "Dialogue %", color: "hsl(var(--muted-foreground))" },
                        }}
                        className="h-56 w-full"
                      >
                        <BarChart data={dialogueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="title" />
                          <YAxis domain={[0, 100]} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="dialogue" fill="var(--color-dialogue)" />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </div>

                  {/* Tone heatmap */}
                  <div>
                    <div className="text-sm mb-2 font-medium">Tone Heatmap</div>
                    <div className="flex flex-wrap gap-3">
                      {act.metrics.map((m) => (
                        <div key={m.id} className="flex w-24 flex-col items-center">
                          <div
                            className="h-8 w-full rounded-sm border"
                            style={{ backgroundColor: toneColor(m.toneScore) }}
                            title={`"${m.title}": tone ${m.toneScore}`}
                          />
                          <span className="mt-1 line-clamp-2 text-center text-[11px] text-muted-foreground">
                            {m.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Step coverage */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Step Coverage</div>
                    <div className="space-y-3">
                      {act.stepCoverage.map((c) => (
                        <div key={c.stepIndex}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{fw.steps[c.stepIndex].title}</span>
                            <span className="font-mono">{c.count}</span>
                          </div>
                          <Progress value={Math.round((c.count / maxCoverage) * 100)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* AI summary */}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">AI Summary</div>
                  {(settings.mode === "managed" || (settings.apiKey && settings.apiKey.length > 0)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const stepsInAct = fw.steps
                          .map((s, idx) => ({ s, idx }))
                          .filter(({ idx }) => getActIndexForStep(fw.id, idx) === act.actIndex);

                        const sceneList = act.scenes.map((s, i) => `Scene ${i + 1}: ${s.title}\n${(s.content || "").trim()}`).join("\n\n");

                        const input = [
                          `Project: ${currentBook.title}`,
                          `Framework: ${fw.name}`,
                          `Act: ${act.actName}`,
                          `Steps in this act:`,
                          ...stepsInAct.map(({ s, idx }) => `- ${idx + 1}. ${s.title}: ${s.purpose}`),
                          `Scenes (titles and content):`,
                          sceneList || "(No scenes yet)",
                        ].join("\n");

                        const messages = [
                          {
                            role: "system" as const,
                            content:
                              "You are a concise story structure analyst. Summarize act pacing, tone, dialogue, and step coverage, then provide insights and suggestions. Keep it under 150 words.",
                          },
                          { role: "user" as const, content: input },
                        ];
                        const content = await chat(messages);
                        setSummaries((prev) => ({ ...prev, [act.actIndex]: content }));
                      }}
                    >
                      {summaries[act.actIndex] ? "Regenerate summary" : "Generate summary"}
                    </Button>
                  )}
                </div>
                {summaries[act.actIndex] ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {summaries[act.actIndex]}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {(settings.mode === "managed" || (settings.apiKey && settings.apiKey.length > 0))
                      ? "Click Generate summary to produce an AI overview of this act."
                      : "Configure AI settings to generate summaries (Assistant > AI settings)."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ActReview;
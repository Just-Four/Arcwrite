"use client";

import * as React from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { showSuccess } from "@/utils/toast";
import { useStyleModel } from "@/hooks/use-style-model";

const StyleTrainer: React.FC = () => {
  const { profile, addSample, removeSample, clearSamples } = useStyleModel();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      file =>
        new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const text = String(reader.result || "");
            addSample(text, file.name);
            resolve();
          };
          reader.readAsText(file);
        }),
    );
    await Promise.all(readers);
    showSuccess("Added writing samples");
  };

  const agg = profile.aggregated;
  const meter = agg
    ? [
        { label: "Avg sentence length", value: Math.min((agg.avgSentenceLength / 30) * 100, 100), hint: `${agg.avgSentenceLength.toFixed(1)} words` },
        { label: "Lexical density", value: Math.min(agg.lexicalDensity * 100, 100), hint: `${(agg.lexicalDensity * 100).toFixed(0)}%` },
        { label: "Dialogue %", value: Math.min(agg.dialoguePercent, 100), hint: `${agg.dialoguePercent.toFixed(0)}%` },
        { label: "Short sentence ratio", value: Math.min(agg.shortSentenceRatio * 100, 100), hint: `${Math.round(agg.shortSentenceRatio * 100)}%` },
      ]
    : [];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Personal voice trainer</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload texts
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button variant="outline" onClick={clearSamples} disabled={profile.samples.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-md border">
          <ScrollArea className="h-[220px] p-3">
            {profile.samples.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Upload your past writing (.txt or .md). We'll learn sentence rhythm, density, and dialogue style.
              </div>
            ) : (
              <div className="space-y-2">
                {profile.samples.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.metrics.words} words • {s.metrics.sentences} sentences • avg {s.metrics.avgSentenceLength.toFixed(1)} words/sentence
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => removeSample(s.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Learned style</div>
          {agg ? (
            <div className="space-y-3">
              {meter.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.label}</span>
                    <span className="text-muted-foreground">{m.hint}</span>
                  </div>
                  <Progress value={m.value} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No samples yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StyleTrainer;
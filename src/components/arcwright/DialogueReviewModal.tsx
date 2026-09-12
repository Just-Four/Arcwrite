"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Book, Character } from "@/hooks/use-arcwright";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  book?: Book;
  character?: Character;
};

function extractQuotedLines(text: string): string[] {
  return (text || "").split(/\n/g).map((l) => l.trim()).filter((l) => /^["“”'’\-]/.test(l));
}

// Simple consistency score: sentence length tendency, tone keywords, vocabulary roughness
function scoreConsistency(line: string, c: Character): number {
  const words = line.trim().split(/\s+/).filter(Boolean);
  const avgLen = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length);
  const lengthScore =
    c.sentenceLength === "short" ? (avgLen < 4 ? 1 : 0.5) :
    c.sentenceLength === "medium" ? (avgLen >= 4 && avgLen <= 6 ? 1 : 0.5) :
    (avgLen > 6 ? 1 : 0.5);

  const toneMatch = c.tone
    ? (new RegExp(`\\b${c.tone.split(/\s*,\s*|\s+/).map((t) => t.trim()).filter(Boolean).join("|")}\\b`, "i").test(line) ? 1 : 0.5)
    : 0.5;

  const vocabScore =
    c.vocabularyLevel === "simple" ? (avgLen <= 5 ? 1 : 0.4) :
    c.vocabularyLevel === "normal" ? (avgLen > 4 && avgLen < 7 ? 1 : 0.6) :
    (avgLen >= 7 ? 1 : 0.5);

  const raw = (lengthScore + toneMatch + vocabScore) / 3;
  return Math.round(raw * 100);
}

const DialogueReviewModal: React.FC<Props> = ({ open, onOpenChange, book, character }) => {
  const scenes = React.useMemo(() => {
    if (!book) return [];
    return book.chapters.flatMap((c) => (c.scenes ?? []).map((sc) => ({ chapterTitle: c.title, scene: sc })));
  }, [book]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dialogue Review{character ? ` — ${character.name}` : ""}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {!character ? (
            <div className="p-3 text-sm text-muted-foreground">Select a character to review.</div>
          ) : (
            <div className="p-3 space-y-4">
              {scenes.map(({ chapterTitle, scene }) => {
                const lines = extractQuotedLines(scene.content || "");
                if (lines.length === 0) return null;
                return (
                  <div key={scene.id} className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">
                      {chapterTitle} — {scene.title}
                    </div>
                    <div className="mt-2 space-y-2">
                      {lines.map((ln, idx) => (
                        <div key={idx} className="rounded-md bg-muted p-2">
                          <div className="text-sm">{ln}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Consistency score: {scoreConsistency(ln, character)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DialogueReviewModal;
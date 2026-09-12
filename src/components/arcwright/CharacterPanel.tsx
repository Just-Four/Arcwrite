"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getFrameworkById, makeStepId } from "@/lib/framework-library";
import { useAI } from "@/hooks/use-ai";
import type { Character } from "@/hooks/use-arcwright";

type Props = {
  bookId: string;
  characters: Character[];
  onCreate: (data: Omit<Character, "id" | "bookId">) => void;
  onUpdate: (id: string, data: Partial<Character>) => void;
  onDelete: (id: string) => void;
  // NEW: framework and arc-beat helpers
  frameworkId?: string;
  getArcBeat?: (bookId: string, characterId: string, stepId: string) => { note?: string; importance?: 1 | 2 | 3 } | undefined;
  setCharacterBeatNote?: (bookId: string, characterId: string, stepId: string, note: string, importance?: 1 | 2 | 3) => void;
};

const emptyCharacter: Omit<Character, "id" | "bookId"> = {
  name: "",
  role: "",
  goal: "",
  fear: "",
  traits: [],
  quirks: [],
  description: "",
  tone: "",
  vocabularyLevel: "normal",
  sentenceLength: "medium",
  speechPatterns: "",
  emotionalDefault: "",
  // NEW: arc defaults
  arcType: "none",
  arcSummary: "",
  startingState: "",
  midpointState: "",
  endingState: "",
  internalNeed: "",
  externalGoalChange: "",
};

const CharacterPanel: React.FC<Props> = ({ bookId, characters, onCreate, onUpdate, onDelete, frameworkId, getArcBeat, setCharacterBeatNote }) => {
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Omit<Character, "id" | "bookId">>(emptyCharacter);
  const [sample, setSample] = React.useState<string>("");
  const { settings, chat } = useAI();

  const isAIReady = settings.mode === "managed" || (settings.apiKey && settings.apiKey.length > 0);

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyCharacter);
    setOpen(true);
  };

  const startEdit = (c: Character) => {
    setEditingId(c.id);
    setDraft({
      name: c.name,
      role: c.role,
      goal: c.goal,
      fear: c.fear,
      traits: c.traits ?? [],
      quirks: c.quirks ?? [],
      description: c.description,
      tone: c.tone,
      vocabularyLevel: c.vocabularyLevel,
      sentenceLength: c.sentenceLength,
      speechPatterns: c.speechPatterns,
      emotionalDefault: c.emotionalDefault,
      arcType: c.arcType ?? "none",
      arcSummary: c.arcSummary ?? "",
      startingState: c.startingState ?? "",
      midpointState: c.midpointState ?? "",
      endingState: c.endingState ?? "",
      internalNeed: c.internalNeed ?? "",
      externalGoalChange: c.externalGoalChange ?? "",
    });
    setSample("");
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      showError("Name is required");
      return;
    }
    if (editingId) {
      onUpdate(editingId, draft);
      showSuccess("Character updated");
    } else {
      onCreate(draft);
      showSuccess("Character created");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    onDelete(id);
    showSuccess("Character deleted");
  };

  const generateFingerprint = async () => {
    if (!isAIReady) {
      showError("Configure AI settings to generate fingerprints.");
      return;
    }
    if (!sample.trim()) {
      showError("Paste 2–5 lines of dialogue to generate.");
      return;
    }
    const system = "You analyze dialogue to infer a character voice fingerprint: tone keywords, vocabulary level (simple/normal/ornate), sentence length tendency (short/medium/long), speech patterns, and emotional default. Reply as JSON with keys: tone, vocabularyLevel, sentenceLength, speechPatterns, emotionalDefault.";
    const user = `Sample dialogue:\n${sample}\n\nReturn JSON only.`;
    const res = await chat([{ role: "system", content: system }, { role: "user", content: user }]);
    try {
      const parsed = JSON.parse(res);
      setDraft((d) => ({
        ...d,
        tone: String(parsed.tone ?? d.tone),
        vocabularyLevel: (["simple", "normal", "ornate"].includes(parsed.vocabularyLevel) ? parsed.vocabularyLevel : d.vocabularyLevel) as "simple" | "normal" | "ornate",
        sentenceLength: (["short", "medium", "long"].includes(parsed.sentenceLength) ? parsed.sentenceLength : d.sentenceLength) as "short" | "medium" | "long",
        speechPatterns: String(parsed.speechPatterns ?? d.speechPatterns),
        emotionalDefault: String(parsed.emotionalDefault ?? d.emotionalDefault),
      }));
      showSuccess("Fingerprint generated");
    } catch {
      showError("AI response wasn't valid JSON. Try again.");
    }
  };

  // NEW: Arc beats editor helpers
  const fw = getFrameworkById(frameworkId);
  const stepIds = React.useMemo(
    () => fw ? fw.steps.map((_, idx) => makeStepId(fw.id, idx)) : [],
    [fw]
  );

  const getBeatNote = (stepId: string): { note: string; importance?: 1 | 2 | 3 } => {
    if (!editingId) return { note: "" };
    const beat = getArcBeat?.(bookId, editingId, stepId);
    return { note: beat?.note ?? "", importance: beat?.importance };
  };

  const setBeatNote = (stepId: string, note: string, importance?: 1 | 2 | 3) => {
    if (!editingId) return;
    setCharacterBeatNote?.(bookId, editingId, stepId, note, importance);
    // no toast spam; save button handles success
  };

  return (
    <Card className="mt-2">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">Characters</CardTitle>
        <Button size="sm" variant="outline" onClick={startNew}>New</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {characters.length === 0 ? (
          <div className="text-xs text-muted-foreground">No characters yet.</div>
        ) : (
          <ScrollArea className="h-56">
            <div className="space-y-2">
              {characters.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.role || "—"}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(c.traits ?? []).slice(0, 4).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => startEdit(c)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Character" : "New Character"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="identity">
            <TabsList className="mb-2">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="arc">Arc</TabsTrigger>
            </TabsList>
            <TabsContent value="identity" className="space-y-2">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
              <Input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role (protagonist, antagonist…)" />
              <Textarea value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="Goal" />
              <Textarea value={draft.fear} onChange={(e) => setDraft({ ...draft, fear: e.target.value })} placeholder="Fear" />
              <Input value={(draft.traits ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, traits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Traits (comma-separated)" />
              <Input value={(draft.quirks ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, quirks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Quirks (comma-separated)" />
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Long description" />
            </TabsContent>
            <TabsContent value="voice" className="space-y-2">
              <Input value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value })} placeholder="Tone (keywords)" />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={draft.vocabularyLevel}
                  onChange={(e) => setDraft({ ...draft, vocabularyLevel: e.target.value as "simple" | "normal" | "ornate" })}
                >
                  <option value="simple">Vocabulary: simple</option>
                  <option value="normal">Vocabulary: normal</option>
                  <option value="ornate">Vocabulary: ornate</option>
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={draft.sentenceLength}
                  onChange={(e) => setDraft({ ...draft, sentenceLength: e.target.value as "short" | "medium" | "long" })}
                >
                  <option value="short">Sentence length: short</option>
                  <option value="medium">Sentence length: medium</option>
                  <option value="long">Sentence length: long</option>
                </select>
              </div>
              <Textarea value={draft.speechPatterns} onChange={(e) => setDraft({ ...draft, speechPatterns: e.target.value })} placeholder="Speech patterns" />
              <Input value={draft.emotionalDefault} onChange={(e) => setDraft({ ...draft, emotionalDefault: e.target.value })} placeholder="Emotional default" />
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Generate fingerprint from a sample</div>
                <Textarea value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Paste 2–5 lines of dialogue…" />
                <Button onClick={generateFingerprint} disabled={!isAIReady}>Generate</Button>
              </div>
            </TabsContent>
            <TabsContent value="arc" className="space-y-3">
              {/* High-level arc fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs mb-1">Arc Type</div>
                  <Select
                    value={draft.arcType ?? "none"}
                    onValueChange={(val) => setDraft({ ...draft, arcType: val as "positive" | "negative" | "flat" | "none" })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select arc type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs mb-1">Internal Need</div>
                  <Input
                    value={draft.internalNeed ?? ""}
                    onChange={(e) => setDraft({ ...draft, internalNeed: e.target.value })}
                    placeholder="Truth they must accept"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">Arc Summary</div>
                  <Textarea
                    value={draft.arcSummary ?? ""}
                    onChange={(e) => setDraft({ ...draft, arcSummary: e.target.value })}
                    placeholder="Overall description of their change or non-change"
                  />
                </div>
                <div>
                  <div className="text-xs mb-1">Starting State</div>
                  <Textarea
                    value={draft.startingState ?? ""}
                    onChange={(e) => setDraft({ ...draft, startingState: e.target.value })}
                    placeholder="Who they are at the beginning"
                  />
                </div>
                <div>
                  <div className="text-xs mb-1">Midpoint State</div>
                  <Textarea
                    value={draft.midpointState ?? ""}
                    onChange={(e) => setDraft({ ...draft, midpointState: e.target.value })}
                    placeholder="How they are around the midpoint"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">Ending State</div>
                  <Textarea
                    value={draft.endingState ?? ""}
                    onChange={(e) => setDraft({ ...draft, endingState: e.target.value })}
                    placeholder="Who they are by the end"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">External Goal Change</div>
                  <Textarea
                    value={draft.externalGoalChange ?? ""}
                    onChange={(e) => setDraft({ ...draft, externalGoalChange: e.target.value })}
                    placeholder="How their external goal evolves"
                  />
                </div>
              </div>

              <Separator />

              {/* Per-step arc beats */}
              <div>
                <div className="text-sm font-medium mb-2">Arc Beats by Structure</div>
                {!fw ? (
                  <div className="text-xs text-muted-foreground">Select a framework for this book to add per-step arc beats.</div>
                ) : !editingId ? (
                  <div className="text-xs text-muted-foreground">Open an existing character to edit arc beats.</div>
                ) : (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-2">
                      For each step, write 1–3 sentences in present tense describing their internal state (what they feel/learn) and outward action. These notes appear in scenes for that step and guide rewrites.
                    </div>
                    <ScrollArea className="max-h-56">
                      <div className="space-y-3">
                        {fw.steps.map((step, idx) => {
                          const sid = makeStepId(fw.id, idx);
                          const current = getBeatNote(sid);
                          return (
                            <div key={sid} className="border rounded-md p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium">
                                  {step.title} <span className="text-muted-foreground">({fw.acts[getActIndex(fw.id, idx)] ?? ""})</span>
                                </div>
                                <select
                                  className="h-8 rounded-md border bg-background px-2 text-xs"
                                  value={current.importance ?? 2}
                                  onChange={(e) => setBeatNote(sid, current.note, Number(e.target.value) as 1 | 2 | 3)}
                                  title="Importance"
                                >
                                  <option value={1}>Importance 1</option>
                                  <option value={2}>Importance 2</option>
                                  <option value={3}>Importance 3</option>
                                </select>
                              </div>
                              <Textarea
                                value={current.note}
                                onChange={(e) => setBeatNote(sid, e.target.value, current.importance)}
                                placeholder={`${step.title}: 1–3 sentences on their internal state and action at this step (present tense).`}
                                className="text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// helper to show act label
function getActIndex(frameworkId: string, stepIndex: number) {
  switch (frameworkId) {
    case "three-act":
      return [0, 0, 0, 1, 1, 2, 2][stepIndex] ?? 0;
    case "heros-journey":
      return stepIndex <= 4 ? 0 : stepIndex <= 8 ? 1 : 2;
    case "save-the-cat":
      if (stepIndex <= 4) return 0;
      if (stepIndex <= 11) return 1;
      return 2;
    case "seven-point":
      if (stepIndex === 0) return 0;
      if (stepIndex <= 4) return 1;
      return 2;
    case "fichtean-curve":
      if (stepIndex <= 1) return 0;
      if (stepIndex <= 3) return 1;
      return 2;
    case "kishotenketsu":
      return stepIndex;
    case "story-circle":
      if (stepIndex <= 2) return 0;
      if (stepIndex <= 5) return 1;
      return 2;
    case "tragedy":
      return stepIndex;
    case "rebirth":
      if (stepIndex <= 1) return 0;
      if (stepIndex === 2) return 1;
      return 2;
    case "freytag":
      return stepIndex;
    default:
      return 0;
  }
}

export default CharacterPanel;
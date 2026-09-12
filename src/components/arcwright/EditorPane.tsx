"use client";

import * as React from "react";
import { Save, Download, FileText, Book as BookIcon, GitBranch as BranchIcon, History as HistoryIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import InlineAISelectionMenu from "./InlineAISelectionMenu";
import SceneHistoryModal from "./SceneHistoryModal";
import CharacterMultiSelect from "./CharacterMultiSelect";
import { getFrameworkById, makeStepId, parseStepId } from "@/lib/framework-library";
import { analyzeText } from "@/utils/style-analytics";
import type { Scene } from "@/hooks/use-arcwright";
import type { Character } from "@/hooks/use-arcwright";
import { useAI } from "@/hooks/use-ai";
import { useStyleModel } from "@/hooks/use-style-model";
import StyleMeter from "@/components/arcwright/StyleMeter";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { exportTextAsDocx, exportTextAsPdf, exportTextAsTxt } from "@/utils/exporters";
import { requestEpubExport } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChapterData = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  scenes?: Scene[];
};

type Props = {
  bookTitle?: string;
  chapter?: ChapterData;
  currentBookId?: string;
  currentFrameworkId?: string;
  currentSceneId?: string;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: string) => void;
  onExportChapter: () => void;
  onExportBook: () => void;
  onSave: () => void;
  onUpdateSceneContent: (bookId: string, chapterId: string, sceneId: string, content: string) => void;
  onUpdateSceneStep: (bookId: string, chapterId: string, sceneId: string, stepId?: string) => void;
  onUpdateSceneMetrics: (
    sceneId: string,
    metrics: {
      sceneId: string;
      wordCount: number;
      sentenceCount: number;
      dialoguePercent: number;
      avgSentenceLength: number;
      shortSentenceRatio: number;
      toneScore: number;
      updatedAt: number;
    }
  ) => void;
  onChangeBookTitle: (title: string) => void;
  onSetSceneCharacters?: (bookId: string, sceneId: string, ids: string[]) => void;

  // NEW: single source of truth data/actions from Index
  characters?: Character[];
  getArcBeat?: (bookId: string, characterId: string, stepId: string) => { note?: string } | undefined;
  setCharacterBeatNote?: (bookId: string, characterId: string, stepId: string, note: string, importance?: 1 | 2 | 3) => void;

  // NEW: focus mode + navigation
  focusMode: boolean;
  chaptersList?: { id: string; title: string; scenes?: Scene[] }[];
  onSelectChapter?: (chapterId: string) => void;
  onSelectScene?: (chapterId: string, sceneId: string) => void;
  onExitFocus?: () => void;

  // NEW: version history
  addSceneVersion: (sceneId: string, text: string) => void;
  listSceneVersions: (sceneId: string) => { sceneId: string; timestamp: number; wordCount: number; text: string }[];
  restoreSceneVersion: (chapterId: string, sceneId: string, text: string) => void;

  // NEW: progress
  totalBookWords: number;
  targetWords: number;
};

const EditorPane: React.FC<Props> = ({
  bookTitle,
  chapter,
  currentBookId,
  currentFrameworkId,
  currentSceneId,
  onChangeTitle,
  onChangeContent,
  onExportChapter,
  onExportBook,
  onSave,
  onUpdateSceneContent,
  onUpdateSceneStep,
  onUpdateSceneMetrics,
  onChangeBookTitle,
  onSetSceneCharacters,

  // NEW
  characters = [],
  getArcBeat,
  setCharacterBeatNote,
  focusMode,
  chaptersList = [],
  onSelectChapter,
  onSelectScene,
  onExitFocus,
  addSceneVersion,
  listSceneVersions,
  restoreSceneVersion,
  totalBookWords,
  targetWords,
}) => {
  // Determine active scene from props
  const activeScene = React.useMemo(() => {
    if (!chapter || !currentSceneId) return undefined;
    return (chapter.scenes ?? []).find((s) => s.id === currentSceneId);
  }, [chapter, currentSceneId]);

  // Local editor buffer bound to active scene, or chapter when no scene selected
  const [editorValue, setEditorValue] = React.useState<string>(activeScene?.content ?? chapter?.content ?? "");

  // Track selected character for "Rewrite as character"
  const [rewriteCharId, setRewriteCharId] = React.useState<string | undefined>(undefined);

  // Keep rewrite character defaulted to the first attached character in the scene
  React.useEffect(() => {
    if (!currentBookId || !currentSceneId) {
      setRewriteCharId(undefined);
      return;
    }
    const sc = (chapter?.scenes ?? []).find((s) => s.id === currentSceneId);
    const ids = sc?.characters ?? sc?.characterIds ?? [];
    setRewriteCharId((prev) => (ids.includes(prev as string) ? prev : ids[0]));
  }, [currentBookId, currentSceneId, chapter?.id, chapter?.scenes]);

  // Sync buffer when scene/chapter changes
  React.useEffect(() => {
    setEditorValue(activeScene?.content ?? chapter?.content ?? "");
  }, [activeScene?.id, activeScene?.content, chapter?.id, chapter?.content]);

  const content = editorValue ?? "";
  const words =
    content.trim().length === 0
      ? 0
      : content.trim().split(/\s+/).filter(Boolean).length;
  const chars = content.length;

  const lastSaved =
    (activeScene?.updatedAt ?? chapter?.updatedAt)
      ? new Date(activeScene?.updatedAt ?? chapter!.updatedAt).toLocaleString()
      : "—";

  const { chat } = useAI();
  const { profile, getStylePrompt } = useStyleModel();
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [rewriting, setRewriting] = React.useState(false);

  // Framework and step options (from props)
  const fw = getFrameworkById(currentFrameworkId);
  const stepOptions = React.useMemo(
    () =>
      fw?.steps.map((s, idx) => ({
        value: makeStepId(fw.id, idx),
        label: `${idx + 1}. ${s.title}`,
      })) ?? [],
    [fw]
  );

  // Selection menu state
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectionRef = React.useRef<{ start: number; end: number } | null>(null);

  // Scene history modal
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyVersions, setHistoryVersions] = React.useState<{ sceneId: string; timestamp: number; wordCount: number; text: string }[]>([]);

  // Track last autosave text/time to avoid duplicates
  const lastAutosaveRef = React.useRef<{ text: string; time: number }>({ text: "", time: 0 });

  // Debounced auto-save per scene (500ms)
  React.useEffect(() => {
    if (!currentBookId || !chapter?.id || !currentSceneId) return;
    const handle = setTimeout(() => {
      onUpdateSceneContent(currentBookId, chapter.id, currentSceneId, editorValue);
    }, 500);
    return () => clearTimeout(handle);
  }, [editorValue, currentBookId, chapter?.id, currentSceneId, onUpdateSceneContent]);

  // NEW: Autosave every 10 seconds with version
  React.useEffect(() => {
    if (!currentBookId || !chapter?.id || !currentSceneId) return;
    const id = setInterval(() => {
      const now = Date.now();
      const last = lastAutosaveRef.current;
      if (editorValue !== last.text || now - last.time >= 10000) {
        onUpdateSceneContent(currentBookId, chapter.id, currentSceneId, editorValue);
        addSceneVersion(currentSceneId, editorValue);
        lastAutosaveRef.current = { text: editorValue, time: now };
      }
    }, 10000);
    return () => clearInterval(id);
  }, [editorValue, currentBookId, chapter?.id, currentSceneId, onUpdateSceneContent, addSceneVersion]);

  // Selection detection for inline menu
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) {
      selectionRef.current = { start, end };
      setMenuPos({ x: e.clientX, y: e.clientY });
      setMenuVisible(true);
    } else {
      setMenuVisible(false);
    }
  };

  // Helper: replace selected text using native API to support undo stack
  const replaceSelectionWith = (replacement: string) => {
    const el = textareaRef.current;
    const range = selectionRef.current;
    if (!el || !range) return;
    const { start, end } = range;
    // Use native setRangeText to integrate with browser undo
    el.setRangeText(replacement, start, end, "preserve");
    // Update local state from element value and keep selection end
    const val = el.value;
    setEditorValue(val);
    // If editing chapter (no scene selected), also propagate
    if (!currentSceneId && chapter) {
      onChangeContent(val);
    }
    // Hide menu
    setMenuVisible(false);
  };

  // AI helpers
  const runAI = async (kind: "rewrite" | "expand" | "tighten" | "tone") => {
    const el = textareaRef.current;
    const range = selectionRef.current;
    if (!el || !range) return;
    const { start, end } = range;
    if (start === end) return;
    const selected = content.slice(start, end);

    const stylePrompt = getStylePrompt();

    // POV character context
    const sc = (chapter?.scenes ?? []).find((s) => s.id === currentSceneId);
    const ids = sc?.characters ?? sc?.characterIds ?? [];
    const povId = ids[0];
    const pov = (characters ?? []).find((c) => c.id === povId);
    const fingerprint = pov?.voice?.fingerprint || `style: ${pov?.voice?.style || pov?.tone || ""}; vocabulary: ${pov?.voice?.vocabulary || pov?.vocabularyLevel || "normal"}; sentenceLength: ${pov?.voice?.sentenceLength || pov?.sentenceLength || "medium"}; notes: ${pov?.voice?.notes || pov?.speechPatterns || ""};`;

    const systemLines = [
      stylePrompt,
      pov ? `POV Character: ${pov.name}\nVoice fingerprint: ${fingerprint}` : undefined,
      "Keep meaning and factual content; maintain scene continuity.",
    ].filter(Boolean);

    let userInstruction = "Rewrite the selection in my style.";
    if (kind === "expand") userInstruction = "Expand the selection: add vivid detail and depth while preserving meaning.";
    if (kind === "tighten") userInstruction = "Tighten the selection: make it more concise and punchy without losing meaning.";
    if (kind === "tone") userInstruction = "Rewrite the selection to match the project's voice/style consistently.";

    const messages = [
      { role: "system" as const, content: systemLines.join("\n") },
      { role: "user" as const, content: `${userInstruction}\n\n${selected}` },
    ];

    const result = await chat(messages);
    const out = result || selected;
    replaceSelectionWith(out);
    showSuccess(kind === "expand" ? "Expanded" : kind === "tighten" ? "Tightened" : kind === "tone" ? "Matched tone" : "Rewrote");
  };

  if (!chapter) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle className="text-xl">Welcome to Arcwright</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Create a book in the sidebar, add a chapter, and start writing.</p>
            <p>Your work is saved locally in your browser.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scene/Book counts
  const sceneWords = (() => {
    const txt = editorValue ?? "";
    return txt.trim() ? txt.trim().split(/\s+/).filter(Boolean).length : 0;
  })();

  // Focus top bar (minimal)
  const FocusTopBar = focusMode ? (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
      <BookIcon className="h-4 w-4 text-muted-foreground" />
      <div className="font-medium">{bookTitle ?? "Untitled Book"}</div>
      <div className="w-48">
        <Select
          value={chapter.id}
          onValueChange={(cid) => onSelectChapter?.(cid)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Chapter" />
          </SelectTrigger>
          <SelectContent>
            {chaptersList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentSceneId && (
        <div className="w-48">
          <Select
            value={currentSceneId}
            onValueChange={(sid) => onSelectScene?.(chapter.id, sid)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Scene" />
            </SelectTrigger>
            <SelectContent>
              {(chapter.scenes ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="ml-auto flex items-center gap-3 text-xs">
        <div>Scene: {sceneWords.toLocaleString()} words</div>
        <div className="flex items-center gap-2">
          <span>Book:</span>
          <div className="w-32">
            <Progress value={Math.min(100, Math.round((totalBookWords / Math.max(1, targetWords)) * 100))} />
          </div>
          <span>
            {totalBookWords.toLocaleString()} / {targetWords.toLocaleString()}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={onExitFocus}>Exit focus</Button>
      </div>
    </div>
  ) : null;

  const buildFullBookText = (): string => {
    if (!bookTitle || !chapter) return "";
    // We don't have direct access to all chapters here; we have current chapter and its scenes.
    // Build from the provided chapter list when available (chaptersList is passed in focus mode; in normal mode we don't rely on it).
    const chs = chaptersList && chaptersList.length > 0 ? chaptersList : chapter ? [{ id: chapter.id, title: chapter.title, scenes: chapter.scenes }] : [];
    const parts: string[] = [];
    chs.forEach((c, idx) => {
      const titleLine = `Chapter ${idx + 1}: ${c.title}`;
      const sceneText = (c.scenes ?? []).map((s) => s.content || "").join("\n\n");
      parts.push(`${titleLine}\n\n${sceneText}`);
    });
    return parts.join("\n\n-----------------------------\n\n");
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Focus top bar or normal toolbar */}
      {focusMode ? (
        FocusTopBar
      ) : (
        <div className="flex items-center gap-2 px-4 py-3">
          <BookIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            value={bookTitle ?? ""}
            onChange={(e) => onChangeBookTitle(e.target.value)}
            className="max-w-xs"
            placeholder="Book title"
          />
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Input
            value={chapter.title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="max-w-md"
            placeholder="Chapter title"
          />
          {fw && currentSceneId && (
            <div className="ml-2 w-56">
              <Select
                value={(chapter.scenes ?? []).find(s => s.id === currentSceneId)?.stepId || "none"}
                onValueChange={(val) => {
                  const mapped = val === "none" ? undefined : val;
                  onUpdateSceneStep(currentBookId!, chapter.id, currentSceneId, mapped);
                  showSuccess("Assigned step");
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Assign Step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {stepOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* NEW: Characters present multi-select */}
          {currentBookId && currentSceneId && (
            <div className="ml-2 flex items-center">
              <CharacterMultiSelect
                characters={characters}
                // Prefer scene.characters, fallback to characterIds
                selectedIds={(() => {
                  const sc = (chapter.scenes ?? []).find(s => s.id === currentSceneId);
                  return (sc?.characters ?? sc?.characterIds ?? []);
                })()}
                onChange={(ids) => onSetSceneCharacters?.(currentBookId!, currentSceneId!, ids)}
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* History button for current scene */}
            {currentSceneId && (
              <Button
                variant="outline"
                onClick={() => {
                  if (currentSceneId) {
                    setHistoryVersions(listSceneVersions(currentSceneId));
                    setHistoryOpen(true);
                  }
                }}
                title="View scene history"
              >
                <HistoryIcon className="h-4 w-4" />
                History
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                onExportChapter();
                showSuccess("Exported chapter");
              }}
            >
              <Download />
              Export chapter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download />
                  Export book
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    onExportBook();
                    showSuccess("Exported book (TXT)");
                  }}
                >
                  Plain Text (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!bookTitle || !chapter) return;
                    const full = buildFullBookText();
                    await exportTextAsDocx(`${bookTitle}.docx`, full);
                    showSuccess("Exported book (DOCX)");
                  }}
                >
                  DOCX (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!bookTitle || !chapter) return;
                    const full = buildFullBookText();
                    await exportTextAsPdf(`${bookTitle}.pdf`, full);
                    showSuccess("Exported book (PDF)");
                  }}
                >
                  PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!currentBookId || !bookTitle) return;
                    const res = await requestEpubExport({ bookId: currentBookId, title: bookTitle });
                    // res expected: { storagePath: string }
                    showSuccess("EPUB export requested");
                  }}
                >
                  EPUB (.epub)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => {
                onSave();
                const text = content;
                if (currentSceneId && text) {
                  const base = analyzeText(text);
                  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
                  const sentenceCount = base?.sentenceCount ?? (text.match(/[.!?]+/g)?.length ?? 0);
                  const pos = (text.match(/\b(good|joy|love|hope|win|calm|happy|kind)\b/gi) || []).length;
                  const neg = (text.match(/\b(bad|hate|fear|loss|sad|angry|pain|dark)\b/gi) || []).length;
                  const toneScore = Math.max(0, Math.min(100, Math.round(((pos + 1) / (neg + 1)) * 50)));
                  onUpdateSceneMetrics(currentSceneId, {
                    sceneId: currentSceneId,
                    wordCount,
                    sentenceCount,
                    dialoguePercent: base.dialoguePercent,
                    avgSentenceLength: base.avgSentenceLength,
                    shortSentenceRatio: base.shortSentenceRatio,
                    toneScore,
                    updatedAt: Date.now(),
                  });
                  // Save a version on manual save
                  addSceneVersion(currentSceneId, text);
                }
                showSuccess("Saved");
              }}
            >
              <Save />
              Save
            </Button>
          </div>
        </div>
      )}

      {!focusMode && <Separator />}

      <div className={`flex-1 p-4 flex gap-4 ${focusMode ? "bg-background" : ""} h-full overflow-hidden`}>
        <ScrollArea className="flex-1 h-full pr-2">
          {/* NEW: Character tags and hover preview of quoted lines */}
          {currentSceneId && (
            <div className="mb-2 flex flex-wrap gap-2">
              {(() => {
                const sc = (chapter.scenes ?? []).find(s => s.id === currentSceneId);
                const ids = sc?.characters ?? sc?.characterIds ?? [];
                return ids.map((cid: string) => {
                  const char = (characters ?? []).find((c: Character) => c.id === cid);
                  if (!char) return null;
                  const quotedLines = content.split(/\n/g).filter((l) => /^["“”'’\-]/.test(l.trim()));
                  return (
                    <Popover key={cid}>
                      <PopoverTrigger asChild>
                        <Badge className="cursor-pointer" title={`Hover to preview ${char.name}'s dialogue`}>
                          {char.name}
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-xs">
                        <div className="text-[11px] font-medium mb-1">{char.name} — quoted lines</div>
                        <div className="space-y-1">
                          {quotedLines.length === 0 ? (
                            <div className="text-[11px] text-muted-foreground">No quoted lines detected.</div>
                          ) : (
                            quotedLines.slice(0, 6).map((ln, i) => (
                              <div key={i} className="text-xs">
                                {ln}
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                });
              })()}
            </div>
          )}

          {/* Character Arcs: now editable and sourced from character.arc.beatsByStep */}
          {currentSceneId && (
            <Card className="mb-2">
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BranchIcon className="h-4 w-4" />
                  Character Arcs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  const scene = (chapter.scenes ?? []).find((s) => s.id === currentSceneId);
                  const stepId = scene?.stepId;
                  const ids = scene?.characters ?? scene?.characterIds ?? [];
                  if (!fw || !stepId || ids.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground">
                        Attach characters and assign a structural step to see arc notes for this scene.
                      </div>
                    );
                  }
                  const parsed = parseStepId(stepId);
                  const stepTitle =
                    parsed && fw && parsed.frameworkId === fw.id && parsed.index >= 0 && parsed.index < fw.steps.length
                      ? fw.steps[parsed.index].title
                      : "Unknown Step";
                  return (
                    <div className="space-y-3">
                      {ids.map((cid: string) => {
                        const char = (characters ?? []).find((c: Character) => c.id === cid);
                        if (!char) return null;
                        const currentNote =
                          (char.arc?.beatsByStep?.[stepId] as string | undefined) ??
                          (getArcBeat?.(currentBookId!, cid, stepId)?.note ?? "");
                        return (
                          <div key={cid} className="border rounded-md p-2">
                            <div className="text-xs font-medium mb-1">
                              {char.name} — {stepTitle}
                            </div>
                            <div className="text-[11px] text-muted-foreground mb-1">
                              1–3 sentences in present tense: what they feel/learn and do at this step. Shown in scenes and used for rewrites.
                            </div>
                            <Textarea
                              value={currentNote}
                              placeholder={`${char.name}'s beat at "${stepTitle}": 1–3 sentences on what they feel/learn and do now (present tense).`}
                              className="text-xs"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCharacterBeatNote?.(currentBookId!, cid, stepId, val);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Textarea
            ref={textareaRef}
            value={editorValue}
            onMouseUp={handleMouseUp}
            onChange={(e) => {
              const val = e.target.value;
              setEditorValue(val);
              // If editing chapter (no scene selected), continue to update chapter content via prop
              if (!currentSceneId && chapter) {
                onChangeContent(val);
              }
            }}
            placeholder="Start writing your story..."
            className={`min-h-[50vh] ${focusMode ? "bg-background" : ""}`}
          />

          {/* Inline AI selection menu */}
          <InlineAISelectionMenu
            x={menuPos.x}
            y={menuPos.y}
            visible={menuVisible}
            onRewrite={() => runAI("rewrite")}
            onExpand={() => runAI("expand")}
            onTighten={() => runAI("tighten")}
            onMatchTone={() => runAI("tone")}
            onClose={() => setMenuVisible(false)}
          />

          {/* NEW: Rewrite as character button */}
          {currentSceneId && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(() => {
                const sc = (chapter.scenes ?? []).find((s) => s.id === currentSceneId);
                const ids = sc?.characters ?? sc?.characterIds ?? [];
                const stepId = sc?.stepId;
                const chars = (characters ?? []).filter((c: Character) =>
                  ids.includes(c.id)
                );

                if (ids.length === 0) return null;

                return (
                  <>
                    {/* Character selector for rewrite */}
                    <div className="w-48">
                      <Select
                        value={rewriteCharId ?? (ids[0] ?? "")}
                        onValueChange={(val) => setRewriteCharId(val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose character" />
                        </SelectTrigger>
                        <SelectContent>
                          {chars.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const el = textareaRef.current;
                        if (!el) return;
                        const start = el.selectionStart ?? 0;
                        const end = el.selectionEnd ?? 0;
                        if (start === end) {
                          showError("Select text to rewrite as a character.");
                          return;
                        }
                        const selected = content.slice(start, end);
                        const cid = rewriteCharId ?? ids[0];
                        const char = (characters ?? []).find(
                          (c: Character) => c.id === cid
                        );
                        if (!char) {
                          showError("Choose a character to rewrite as.");
                          return;
                        }

                        setRewriting(true);

                        // Framework step details
                        const fwLocal = fw;
                        const parsed = stepId ? parseStepId(stepId) : undefined;
                        const stepTitle =
                          parsed &&
                          fwLocal &&
                          parsed.frameworkId === fwLocal.id &&
                          parsed.index >= 0 &&
                          parsed.index < fwLocal.steps.length
                            ? fwLocal.steps[parsed.index].title
                            : undefined;

                        // Character voice and arc context
                        const v = char.voice;
                        const fingerprint =
                          v?.fingerprint ||
                          `style: ${v?.style || char.tone || ""}; vocabulary: ${
                            v?.vocabulary || char.vocabularyLevel || "normal"
                          }; sentenceLength: ${v?.sentenceLength || char.sentenceLength || "medium"}; notes: ${
                            v?.notes || char.speechPatterns || ""
                          }; emotionalDefault: ${char.emotionalDefault || ""}`;
                        const traits = (char.traits ?? []).join(", ");
                        const arcType = char.arc?.type || char.arcType || "none";
                        const arcSummary = char.arc?.summary || char.arcSummary || "";
                        const currentStepBeat =
                          (stepId ? char.arc?.beatsByStep?.[stepId] : "") ||
                          (stepId ? getArcBeat?.(currentBookId!, char.id, stepId)?.note : "") ||
                          "";

                        const system = [
                          "You rewrite text in a specific character's voice and current emotional context.",
                          `Character: ${char.name}`,
                          `Traits: ${traits || "n/a"}`,
                          `Voice fingerprint: ${fingerprint}`,
                          `Arc type: ${arcType}`,
                          arcSummary ? `Arc summary: ${arcSummary}` : undefined,
                          stepTitle ? `Current structural step: ${stepTitle}` : undefined,
                          currentStepBeat
                            ? `Arc beat for this step: ${currentStepBeat}`
                            : "Arc beat for this step: (not defined; stay consistent with arc type and summary)",
                          "Rules:",
                          "- Keep meaning, facts, and scene context.",
                          "- Maintain the character's voice and emotional state for this step.",
                          "- Improve clarity and flow without adding new plot facts.",
                        ]
                          .filter(Boolean)
                          .join("\n");

                        const messages = [
                          { role: "system" as const, content: system },
                          {
                            role: "user" as const,
                            content: `Rewrite the following selection as ${char.name}${
                              stepTitle ? ` during "${stepTitle}"` : ""
                            }.\n\n${selected}`,
                          },
                        ];
                        const rewritten = await chat(messages);
                        const newContent = content.slice(0, start) + (rewritten || selected) + content.slice(end);
                        setEditorValue(newContent);
                        showSuccess(`Rewrote selection as ${char.name}`);
                        setRewriting(false);
                      }}
                    >
                      Rewrite as character
                    </Button>
                  </>
                );
              })()}
            </div>
          )}
        </ScrollArea>
        <StyleMeter content={content} profile={{ samples: [], aggregated: profile.aggregated }} />
      </div>

      {!focusMode && <Separator />}

      {/* Footer with counts (visible in both modes) */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>Book: {bookTitle ?? "Untitled Book"}</span>
          <span>Scene words: {sceneWords}</span>
          <span>Book words: {totalBookWords.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Progress value={Math.min(100, Math.round((totalBookWords / Math.max(1, targetWords)) * 100))} />
          </div>
          <span>
            {totalBookWords.toLocaleString()} / {targetWords.toLocaleString()}
          </span>
          <span>Last update: {lastSaved}</span>
        </div>
      </div>

      {/* Scene history modal */}
      {currentSceneId && (
        <SceneHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          versions={historyVersions}
          onRestore={(v) => {
            restoreSceneVersion(chapter.id, currentSceneId, v.text);
            setEditorValue(v.text);
            setHistoryOpen(false);
            showSuccess("Version restored");
          }}
        />
      )}
    </div>
  );
};

export default EditorPane;
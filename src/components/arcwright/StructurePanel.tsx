"use client";

import * as React from "react";
import { Book as BookIcon, Plus, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Book as BookType, Chapter } from "@/hooks/use-arcwright";
import { Link } from "react-router-dom";
import ChapterScenesList from "./ChapterScenesList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getFrameworkById, frameworks, makeStepId } from "@/lib/framework-library";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { parseStepId, getActIndexForStep } from "@/lib/framework-library";
import CharacterPanel from "./CharacterPanel";

type Props = {
  books: BookType[];
  currentBookId?: string;
  currentChapterId?: string;
  onSelect: (bookId: string, chapterId?: string) => void;
  onNewBook: (frameworkId?: string) => void;
  onNewChapter: (bookId: string) => void;
  onAddScene: (bookId: string, chapterId: string) => void;
  onRenameScene: (bookId: string, chapterId: string, sceneId: string, title: string) => void;
  onReorderScenes: (bookId: string, chapterId: string, orderedIds: string[]) => void;
  onSetSceneStep: (bookId: string, chapterId: string, sceneId: string, stepId?: string) => void;
  currentSceneId?: string;
  onSelectScene: (bookId: string, chapterId: string, sceneId: string) => void;
  onChangeBookFramework?: (bookId: string, frameworkId?: string) => void; // NEW
  onSetChapterAct?: (bookId: string, chapterId: string, actIndex?: number) => void; // NEW

  // NEW: character CRUD and arc-beat actions (single source of truth from Index)
  onCreateCharacter?: (bookId: string, data: any) => void;
  onUpdateCharacter?: (bookId: string, id: string, data: any) => void;
  onDeleteCharacter?: (bookId: string, id: string) => void;
  getArcBeat?: (bookId: string, characterId: string, stepId: string) => any;
  setCharacterBeatNote?: (bookId: string, characterId: string, stepId: string, note: string, importance?: 1 | 2 | 3) => void;
};

const StructurePanel: React.FC<Props> = ({
  books,
  currentBookId,
  currentChapterId,
  onSelect,
  onNewBook,
  onNewChapter,
  onAddScene,
  onRenameScene,
  onReorderScenes,
  onSetSceneStep,
  currentSceneId,
  onSelectScene,
  onChangeBookFramework, // NEW
  onSetChapterAct, // NEW

  // NEW: character CRUD and arc-beat actions (single source of truth from Index)
  onCreateCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  getArcBeat,
  setCharacterBeatNote,
}) => {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedFramework, setSelectedFramework] = React.useState<string | "none" | "">("");
  const [selectedActIndex, setSelectedActIndex] = React.useState<number>(0);
  const [frameworkOpen, setFrameworkOpen] = React.useState(true);
  const [visibilityMode, setVisibilityMode] = React.useState<number>(3);
  const visibilityLabels = ["Hidden", "Minimal", "Beats", "Full"];

  // NEW: open/closed state per chapter
  const [openChapters, setOpenChapters] = React.useState<Record<string, boolean>>({});

  // Ensure the active chapter is open by default
  React.useEffect(() => {
    if (currentChapterId) {
      setOpenChapters((prev) => ({ ...prev, [currentChapterId]: true }));
    }
  }, [currentChapterId]);

  // NEW: derive active entities and step at the top level
  const activeBook = React.useMemo(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );
  const activeChapter = React.useMemo(
    () => activeBook?.chapters.find((c) => c.id === currentChapterId),
    [activeBook, currentChapterId]
  );
  const activeFramework = React.useMemo(
    () => getFrameworkById(activeBook?.frameworkId),
    [activeBook?.frameworkId]
  );
  const selectedSceneStepId = React.useMemo(() => {
    if (!currentSceneId || !activeChapter) return undefined;
    return (activeChapter.scenes ?? []).find((sc) => sc.id === currentSceneId)?.stepId;
  }, [activeChapter, currentSceneId]);

  // NEW: default to Act I when opening a book/chapter or framework changes
  React.useEffect(() => {
    if (activeFramework) setSelectedActIndex(0);
  }, [activeFramework?.id, activeBook?.id, activeChapter?.id]);

  // NEW: auto-select the act containing the selected scene's step
  React.useEffect(() => {
    if (activeFramework && selectedSceneStepId) {
      const parsed = parseStepId(selectedSceneStepId);
      if (parsed && parsed.frameworkId === activeFramework.id) {
        const actIdx = getActIndexForStep(activeFramework.id, parsed.index);
        setSelectedActIndex(actIdx);
      }
    }
  }, [activeFramework?.id, selectedSceneStepId]);

  return (
    <div className="flex h-full w-full flex-col border-r">
      <div className="flex items-center gap-2 px-3 py-2">
        <BookIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Structure</span>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <Plus />
              New book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new project</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-sm">Choose a framework</div>
              <Select value={selectedFramework} onValueChange={(v) => setSelectedFramework(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {frameworks.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  onNewBook(selectedFramework === "none" || selectedFramework === "" ? undefined : selectedFramework);
                  setSelectedFramework("");
                  setCreateOpen(false);
                }}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/library">Library</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/act-review">Act Review</Link>
        </Button>
      </div>

      {/* NEW: Structure visibility slider */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Visibility</span>
          <Slider
            min={0}
            max={3}
            step={1}
            value={[visibilityMode]}
            onValueChange={(vals) => setVisibilityMode(vals[0] ?? 0)}
            className="w-40"
          />
          <span className="text-[11px]">{visibilityLabels[visibilityMode]}</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-2 space-y-2">
          {/* NEW: Characters panel for active book */}
          {activeBook && (
            <CharacterPanel
              bookId={activeBook.id}
              characters={activeBook.characters ?? []}
              frameworkId={activeBook.frameworkId}
              getArcBeat={getArcBeat}
              setCharacterBeatNote={setCharacterBeatNote}
              onCreate={(data) => onCreateCharacter?.(activeBook.id, data)}
              onUpdate={(id, data) => onUpdateCharacter?.(activeBook.id, id, data)}
              onDelete={(id) => onDeleteCharacter?.(activeBook.id, id)}
            />
          )}

          {books.map((book) => {
            const isActiveBook = book.id === currentBookId;
            const fw = getFrameworkById(book.frameworkId);
            return (
              <div key={book.id} className="rounded-md">
                <button
                  type="button"
                  onClick={() => onSelect(book.id, book.chapters[0]?.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                    isActiveBook ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <BookIcon className="h-4 w-4" />
                  <span className="truncate">{book.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewChapter(book.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </button>

                {isActiveBook && (
                  <div className="mt-1 ml-6 mr-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Framework</span>
                    <Select
                      value={book.frameworkId ?? "none"}
                      onValueChange={(val) => {
                        const next = val === "none" ? undefined : val;
                        onChangeBookFramework?.(book.id, next);
                      }}
                    >
                      <SelectTrigger className="h-7 w-56 text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {frameworks.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Collapsible structure overview ABOVE chapters (conditionally shown by visibility mode) */}
                {isActiveBook && fw && visibilityMode > 0 && (
                  <div className="mt-2 ml-6 mr-2">
                    <button
                      type="button"
                      onClick={() => setFrameworkOpen((o) => !o)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ChevronRight
                        className={`h-3 w-3 transition-transform ${frameworkOpen ? "rotate-90" : "rotate-0"}`}
                      />
                      <span className="truncate font-medium">
                        Structure overview{fw ? `: ${fw.name}` : ""}
                      </span>
                    </button>

                    {frameworkOpen && (
                      <div className="mt-2 rounded-md border">
                        <Tabs
                          value={`act-${selectedActIndex}`}
                          onValueChange={(val) => {
                            const idx = Number(val.replace("act-", ""));
                            if (!Number.isNaN(idx)) setSelectedActIndex(idx);
                          }}
                          className="rounded-md"
                        >
                          <TabsList className="flex flex-wrap gap-1 p-1">
                            {fw.acts.map((act, i) => (
                              <TabsTrigger key={i} value={`act-${i}`} className="text-[11px]">
                                {act}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {/* Minimal: show acts only, no steps */}
                          {visibilityMode !== 1 &&
                            fw.acts.map((act, i) => (
                              <TabsContent key={i} value={`act-${i}`} className="p-2">
                                <div className="space-y-1">
                                  {fw.steps.map((s, idx) => {
                                    if (getActIndexForStep(fw.id, idx) !== i) return null;
                                    const value = makeStepId(fw.id, idx);
                                    const isLinked = selectedSceneStepId === value;
                                    return (
                                      <div
                                        key={value}
                                        className={`rounded-md px-2 py-1 ${isLinked ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                                      >
                                        <div className="text-[12px] font-medium">
                                          {idx + 1}. {s.title}
                                        </div>
                                        {visibilityMode === 3 && (
                                          <div className="mt-1 pl-3 text-[11px] text-muted-foreground">
                                            {s.purpose}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </TabsContent>
                            ))}
                        </Tabs>
                      </div>
                    )}
                  </div>
                )}

                {book.chapters.length > 0 && (
                  <div className="mt-1 ml-6 space-y-1">
                    {book.chapters.map((chapter: Chapter) => {
                      const isActiveChapter =
                        isActiveBook && chapter.id === currentChapterId;
                      const stepOptions =
                        fw?.steps.map((s, idx) => ({
                          value: makeStepId(fw.id, idx),
                          label: `${idx + 1}. ${s.title}`,
                        })) ?? [];

                      const selectedSceneStepIdForChapter =
                        isActiveChapter ? selectedSceneStepId : undefined;

                      // NEW: compute open state for this chapter (defaults to active chapter)
                      const isOpen =
                        openChapters[chapter.id] ??
                        (isActiveChapter ? true : false);

                      return (
                        <div key={chapter.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(book.id, chapter.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
                              isActiveChapter
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {/* NEW: chevron toggles open/closed without selecting the chapter */}
                            <ChevronRight
                              className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : "rotate-0"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenChapters((prev) => ({
                                  ...prev,
                                  [chapter.id]: !isOpen,
                                }));
                              }}
                              aria-label={isOpen ? "Collapse chapter" : "Expand chapter"}
                            />
                            <span className="truncate">{chapter.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddScene(book.id, chapter.id);
                              }}
                              aria-label="Add scene"
                              title="Add scene"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </button>

                          {/* NEW: render chapter details only when expanded */}
                          {isOpen && (
                            <>
                              {/* Optional Act link per chapter: hidden when Visibility = Hidden */}
                              {isActiveBook && fw && visibilityMode > 0 && (
                                <div className="ml-6 mr-2 mt-1 flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground">Act</span>
                                  <Select
                                    value={
                                      typeof chapter.actIndex === "number"
                                        ? String(chapter.actIndex)
                                        : "none"
                                    }
                                    onValueChange={(val) => {
                                      const next =
                                        val === "none" ? undefined : Number(val);
                                      onSetChapterAct?.(book.id, chapter.id, Number.isNaN(next) ? undefined : next);
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-40 text-xs">
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {fw.acts.map((act, i) => (
                                        <SelectItem key={i} value={String(i)}>
                                          {act}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <ChapterScenesList
                                scenes={(chapter.scenes ?? []).map((s) => ({ id: s.id, title: s.title, stepId: s.stepId }))}
                                onRename={(sceneId, title) => onRenameScene(book.id, chapter.id, sceneId, title)}
                                onReorder={(orderedIds) => onReorderScenes(book.id, chapter.id, orderedIds)}
                                onSetStep={(sceneId, stepId) => onSetSceneStep(book.id, chapter.id, sceneId, stepId)}
                                stepOptions={stepOptions}
                                onSelect={(sceneId) => onSelectScene(book.id, chapter.id, sceneId)}
                                selectedId={isActiveChapter ? currentSceneId : undefined}
                              />

                              {/* Characters line under each scene list item */}
                              {(chapter.scenes ?? []).length > 0 && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {(chapter.scenes ?? []).map((sc) => {
                                    const ids = (sc.characters ?? sc.characterIds) ?? [];
                                    const names = ids
                                      .map((cid) => (book.characters ?? []).find((c) => c.id === cid)?.name)
                                      .filter(Boolean) as string[];
                                    return (
                                      <div key={sc.id} className="text-[11px] text-muted-foreground">
                                        Characters: {names.length > 0 ? names.join(", ") : "—"}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {books.length === 0 && (
            <div className="px-2 py-6 text-sm text-muted-foreground">
              No books yet. Create one to get started.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default StructurePanel;
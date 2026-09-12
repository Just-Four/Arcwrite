import * as React from "react";
import { useArcwright } from "@/hooks/use-arcwright";
import { downloadTextFile } from "@/utils/download";
import EditorPane from "@/components/arcwright/EditorPane";
import StructurePanel from "@/components/arcwright/StructurePanel";
import AssistantPanel from "@/components/arcwright/AssistantPanel";
import AddDemoButton from "@/components/arcwright/AddDemoButton";
import AIQuickSettings from "@/components/arcwright/AIQuickSettings";
import { showSuccess } from "@/utils/toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  const {
    books,
    currentBook,
    currentChapter,
    currentBookId,
    currentChapterId,
    actions,
    currentSceneId,
  } = useArcwright();

  // NEW: focus mode
  const [focusMode, setFocusMode] = React.useState(false);

  // NEW: compute total words for current book
  const totalBookWords = React.useMemo(() => {
    if (!currentBook) return 0;
    const fromChapters = currentBook.chapters.reduce((sum, ch) => {
      const chapterWords = (ch.content || "").trim().split(/\s+/).filter(Boolean).length;
      const sceneWords = (ch.scenes ?? []).reduce((s2, sc) => s2 + ((sc.content || "").trim().split(/\s+/).filter(Boolean).length), 0);
      return sum + chapterWords + sceneWords;
    }, 0);
    return fromChapters;
  }, [currentBook]);

  const handleExportChapter = React.useCallback(() => {
    if (!currentBook || !currentChapter) return;
    const filename = `${currentBook.title} - ${currentChapter.title}.txt`;
    downloadTextFile(filename, currentChapter.content);
  }, [currentBook, currentChapter]);

  const handleExportBook = React.useCallback(() => {
    if (!currentBook) return;
    const all = currentBook.chapters
      .map((c, idx) => `Chapter ${idx + 1}: ${c.title}\n\n${c.content}\n`)
      .join("\n-----------------------------\n\n");
    const filename = `${currentBook.title}.txt`;
    downloadTextFile(filename, all);
  }, [currentBook]);

  return (
    <div className="h-svh w-full">
      {/* NEW: top toolbar with Focus toggle (visible always) */}
      <div className="flex items-center gap-2 px-4 h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="font-semibold">{currentBook?.title ?? "Arcwright"}</div>
        <div className="text-xs text-muted-foreground">
          {currentChapter ? currentChapter.title : "No chapter selected"}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={focusMode ? "secondary" : "outline"} size="sm" onClick={() => setFocusMode((v) => !v)}>
            {focusMode ? "Exit focus" : "Focus"}
          </Button>
          {!focusMode && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/library">Library</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Hide Quick Settings in focus mode */}
      {!focusMode && (
        <div className="fixed right-4 top-16 z-20">
          <AIQuickSettings />
        </div>
      )}

      {focusMode ? (
        // Focus mode: single central editor with clean background
        <div className="h-[calc(100vh-56px)]">
          <EditorPane
            bookTitle={currentBook?.title}
            chapter={
              currentChapter
                ? {
                    id: currentChapter.id,
                    title: currentChapter.title,
                    content: currentChapter.content,
                    updatedAt: currentChapter.updatedAt,
                    scenes: currentChapter.scenes,
                  }
                : undefined
            }
            currentBookId={currentBook?.id}
            currentFrameworkId={currentBook?.frameworkId}
            currentSceneId={currentSceneId}
            onChangeTitle={(title) => {
              if (currentBook && currentChapter) {
                actions.updateChapterTitle(currentBook.id, currentChapter.id, title);
              }
            }}
            onChangeContent={(content) => {
              if (currentBook && currentChapter) {
                actions.updateChapterContent(currentBook.id, currentChapter.id, content);
              }
            }}
            onExportChapter={handleExportChapter}
            onExportBook={handleExportBook}
            onSave={() => {}}
            onUpdateSceneContent={(bookId, chapterId, sceneId, content) =>
              actions.updateSceneContent(bookId, chapterId, sceneId, content)
            }
            onUpdateSceneStep={(bookId, chapterId, sceneId, stepId) =>
              actions.updateSceneStep(bookId, chapterId, sceneId, stepId)
            }
            onUpdateSceneMetrics={(sceneId, metrics) =>
              actions.updateSceneMetrics(sceneId, metrics)
            }
            onChangeBookTitle={(title) => {
              if (currentBookId) {
                actions.updateBookTitle(currentBookId, title);
              }
            }}
            onSetSceneCharacters={(bookId, sceneId, ids) => actions.setSceneCharacters(bookId, sceneId, ids)}
            characters={currentBook?.characters ?? []}
            getArcBeat={(bookId, characterId, stepId) => actions.getArcBeat(bookId, characterId, stepId)}
            setCharacterBeatNote={(bookId, characterId, stepId, note, importance) =>
              actions.setCharacterBeatNote(bookId, characterId, stepId, note, importance)
            }
            // NEW: focus mode props + history + progress
            focusMode={true}
            chaptersList={currentBook?.chapters ?? []}
            onSelectChapter={(chapterId) => currentBook && actions.setCurrent(currentBook.id, chapterId)}
            onSelectScene={(chapterId, sceneId) => currentBook && actions.setCurrentScene(currentBook.id, chapterId, sceneId)}
            onExitFocus={() => setFocusMode(false)}
            addSceneVersion={(sceneId, text) => actions.addSceneVersion(sceneId, text)}
            listSceneVersions={(sceneId) => actions.listSceneVersions(sceneId)}
            restoreSceneVersion={(chapterId, sceneId, text) => {
              if (!currentBook) return;
              actions.restoreSceneVersion(currentBook.id, chapterId, sceneId, text);
            }}
            totalBookWords={totalBookWords}
            targetWords={currentBook?.targetWords ?? 80000}
          />
        </div>
      ) : (
        // Normal three-pane layout
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-56px)]">
          <ResizablePanel defaultSize={22} minSize={16}>
            <StructurePanel
              books={books}
              currentBookId={currentBookId}
              currentChapterId={currentChapterId}
              onSelect={(bookId, chapterId) => actions.setCurrent(bookId, chapterId)}
              onNewBook={(frameworkId) => actions.newBook(undefined, frameworkId)}
              onNewChapter={(bookId) => actions.newChapter(bookId)}
              onAddScene={(bookId, chapterId) => actions.addScene(bookId, chapterId)}
              onRenameScene={(bookId, chapterId, sceneId, title) =>
                actions.updateSceneTitle(bookId, chapterId, sceneId, title)
              }
              onReorderScenes={(bookId, chapterId, orderedIds) =>
                actions.reorderScenes(bookId, chapterId, orderedIds)
              }
              onSetSceneStep={(bookId, chapterId, sceneId, stepId) =>
                actions.updateSceneStep(bookId, chapterId, sceneId, stepId)
              }
              currentSceneId={currentSceneId}
              onSelectScene={(bookId, chapterId, sceneId) =>
                actions.setCurrentScene(bookId, chapterId, sceneId)
              }
              onChangeBookFramework={(bookId, frameworkId) =>
                actions.updateBookFramework(bookId, frameworkId)
              }
              onSetChapterAct={(bookId, chapterId, actIndex) =>
                actions.updateChapterAct(bookId, chapterId, actIndex)
              }
              onCreateCharacter={(bookId, data) => actions.createCharacter(bookId, data)}
              onUpdateCharacter={(bookId, id, data) => actions.updateCharacter(bookId, id, data)}
              onDeleteCharacter={(bookId, id) => actions.deleteCharacter(bookId, id)}
              getArcBeat={(bookId, characterId, stepId) => actions.getArcBeat(bookId, characterId, stepId)}
              setCharacterBeatNote={(bookId, characterId, stepId, note, importance) =>
                actions.setCharacterBeatNote(bookId, characterId, stepId, note, importance)
              }
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={56} minSize={40}>
            <EditorPane
              bookTitle={currentBook?.title}
              chapter={
                currentChapter
                  ? {
                      id: currentChapter.id,
                      title: currentChapter.title,
                      content: currentChapter.content,
                      updatedAt: currentChapter.updatedAt,
                      scenes: currentChapter.scenes,
                    }
                  : undefined
              }
              currentBookId={currentBook?.id}
              currentFrameworkId={currentBook?.frameworkId}
              currentSceneId={currentSceneId}
              onChangeTitle={(title) => {
                if (currentBook && currentChapter) {
                  actions.updateChapterTitle(currentBook.id, currentChapter.id, title);
                }
              }}
              onChangeContent={(content) => {
                if (currentBook && currentChapter) {
                  actions.updateChapterContent(currentBook.id, currentChapter.id, content);
                }
              }}
              onExportChapter={handleExportChapter}
              onExportBook={handleExportBook}
              onSave={() => {}}
              onUpdateSceneContent={(bookId, chapterId, sceneId, content) =>
                actions.updateSceneContent(bookId, chapterId, sceneId, content)
              }
              onUpdateSceneStep={(bookId, chapterId, sceneId, stepId) =>
                actions.updateSceneStep(bookId, chapterId, sceneId, stepId)
              }
              onUpdateSceneMetrics={(sceneId, metrics) =>
                actions.updateSceneMetrics(sceneId, metrics)
              }
              onChangeBookTitle={(title) => {
                if (currentBookId) {
                  actions.updateBookTitle(currentBookId, title);
                }
              }}
              onSetSceneCharacters={(bookId, sceneId, ids) => actions.setSceneCharacters(bookId, sceneId, ids)}
              characters={currentBook?.characters ?? []}
              getArcBeat={(bookId, characterId, stepId) => actions.getArcBeat(bookId, characterId, stepId)}
              setCharacterBeatNote={(bookId, characterId, stepId, note, importance) =>
                actions.setCharacterBeatNote(bookId, characterId, stepId, note, importance)
              }
              // Not in focus mode
              focusMode={false}
              totalBookWords={totalBookWords}
              targetWords={currentBook?.targetWords ?? 80000}
              // History (available in normal mode too)
              addSceneVersion={(sceneId, text) => actions.addSceneVersion(sceneId, text)}
              listSceneVersions={(sceneId) => actions.listSceneVersions(sceneId)}
              restoreSceneVersion={(chapterId, sceneId, text) => {
                if (!currentBook) return;
                actions.restoreSceneVersion(currentBook.id, chapterId, sceneId, text);
              }}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={22} minSize={16}>
            <AssistantPanel
              onExportJSON={() => actions.exportData()}
              onImportJSON={(json) => actions.importData(json)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <AddDemoButton
        onClick={() => {
          actions.addDemoBook();
          showSuccess("Demo book added and selected");
        }}
      />
    </div>
  );
};

export default Index;
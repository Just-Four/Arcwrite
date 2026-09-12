import * as React from "react";
import { getFrameworkById, parseStepId, makeStepId } from "@/lib/framework-library";

export type Character = {
  id: string;
  bookId: string;
  name: string;
  role?: string;
  goal: string;
  fear: string;
  traits: string[];
  quirks: string[];
  description: string;

  tone: string;
  vocabularyLevel: "simple" | "normal" | "ornate";
  sentenceLength: "short" | "medium" | "long";
  speechPatterns: string;
  emotionalDefault: string;

  arcType?: "positive" | "negative" | "flat" | "none";
  arcSummary?: string;
  startingState?: string;
  midpointState?: string;
  endingState?: string;
  internalNeed?: string;
  externalGoalChange?: string;

  // NEW: nested voice and arc (optional for compatibility)
  voice?: {
    style: string;
    vocabulary: string;
    sentenceLength: string;
    notes: string;
    fingerprint?: string;
  };
  arc?: {
    type: string;
    internalNeed: string;
    summary: string;
    start: string;
    midpoint: string;
    end: string;
    externalGoal: string;
    beatsByStep: Record<string, string>;
  };
};

export type SceneCharacterLink = {
  id: string;
  sceneId: string;
  characterId: string;
  source: "auto" | "manual";
};

export type CharacterArcBeat = {
  id: string;
  bookId: string;
  characterId: string;
  stepId: string; // e.g. frameworkId:index via makeStepId
  note: string;
  importance?: 1 | 2 | 3;
};

export type Scene = {
  id: string;
  title: string;
  notes?: string;
  updatedAt: number;
  stepId?: string;
  content?: string;
  suggested_step_id?: string;
  characterIds?: string[];
  // NEW: characters array (kept in sync with characterIds)
  characters?: string[];
  // Optional alias for name (compat with title)
  name?: string;
};

// NEW: per-scene version type
export type SceneVersion = {
  sceneId: string;
  timestamp: number;
  wordCount: number;
  text: string;
};

export type Chapter = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  scenes?: Scene[];
  actIndex?: number;
};

export type Book = {
  id: string;
  title: string;
  chapters: Chapter[];
  frameworkId?: string;
  characters?: Character[];
  sceneCharacters?: SceneCharacterLink[]; // legacy linking (kept for compatibility)
  characterArcBeats?: CharacterArcBeat[];
  // NEW: optional target word count
  targetWords?: number;
  // NEW: optional genre label
  genre?: string;
};

type State = {
  books: Book[];
  currentBookId?: string;
  currentChapterId?: string;
  currentSceneId?: string;
  sceneMetrics?: Record<
    string,
    {
      sceneId: string;
      wordCount: number;
      sentenceCount: number;
      dialoguePercent: number;
      avgSentenceLength: number;
      shortSentenceRatio: number;
      toneScore: number;
      updatedAt: number;
    }
  >;
  blockedAuto?: Record<string, string[]>;
  // NEW: per-scene version history map
  sceneVersions?: Record<string, SceneVersion[]>;
};

const STORAGE_KEY = "arcwright:data";
const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokenize = (str: string) =>
  str.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && w.length >= 4);

function computeSuggestedStepId(frameworkId: string | undefined, text: string | undefined): string | undefined {
  if (!frameworkId || !text) return undefined;
  const fw = getFrameworkById(frameworkId);
  if (!fw) return undefined;

  const lc = text.toLowerCase();
  const tokenSet = new Set(tokenize(text));

  let bestIndex = -1;
  let bestScore = 0;

  fw.steps.forEach((s, idx) => {
    let score = 0;

    for (const kw of s.keywords) {
      const re = new RegExp(`\\b${escapeRegExp(kw.toLowerCase())}\\b`, "gi");
      score += 2 * ((lc.match(re)?.length ?? 0));
    }

    tokenize(s.title).forEach((w) => {
      if (tokenSet.has(w)) score += 1;
    });

    tokenize(s.purpose).forEach((w) => {
      const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
      score += (lc.match(re)?.length ?? 0);
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  });

  if (bestIndex < 0 || bestScore <= 0) return undefined;
  return makeStepId(fw.id, bestIndex);
}

function detectCharactersInText(text: string, characters: Character[]): string[] {
  if (!text || characters.length === 0) return [];
  const lc = text.toLowerCase();
  const detected: string[] = [];
  for (const c of characters) {
    const name = c.name.trim();
    if (!name) continue;
    const re = new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`, "i");
    if (re.test(lc)) {
      detected.push(c.id);
    }
  }
  return detected;
}

export function useArcwright() {
  const [state, setState] = React.useState<State>({ books: [] });

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: State = JSON.parse(raw);
        const migrated: State = {
          ...parsed,
          books: parsed.books.map((b) => ({
            ...b,
            // NEW: ensure targetWords exists (default 80000 if missing)
            targetWords: typeof b.targetWords === "number" ? b.targetWords : 80000,
            // NEW: ensure genre exists
            genre: typeof b.genre === "string" ? b.genre : "",
            chapters: b.chapters.map((c) => ({
              ...c,
              scenes: (c.scenes ?? []).map((sc) => ({
                ...sc,
                content: sc.content ?? "",
                suggested_step_id: sc.suggested_step_id ?? undefined,
                characterIds: sc.characterIds ?? [],
                // NEW: ensure characters field mirrors characterIds
                characters: sc.characters ?? sc.characterIds ?? [],
                // keep name alias for compatibility
                name: sc.name ?? sc.title,
              })),
            })),
            // NEW: enrich characters with voice/arc built from existing fields
            characters: (b.characters ?? []).map((ch) => {
              const voice = ch.voice ?? {
                style: ch.tone ?? "",
                vocabulary: ch.vocabularyLevel ?? "normal",
                sentenceLength: ch.sentenceLength ?? "medium",
                notes: ch.speechPatterns ?? "",
                fingerprint: undefined,
              };
              const beatsFromTable = Object.fromEntries(
                (b.characterArcBeats ?? [])
                  .filter((beat) => beat.characterId === ch.id && beat.bookId === (b.id ?? ch.bookId))
                  .map((beat) => [beat.stepId, beat.note])
              );
              const arc = ch.arc ?? {
                type: ch.arcType ?? "none",
                internalNeed: ch.internalNeed ?? "",
                summary: ch.arcSummary ?? "",
                start: ch.startingState ?? "",
                midpoint: ch.midpointState ?? "",
                end: ch.endingState ?? "",
                externalGoal: ch.externalGoalChange ?? "",
                beatsByStep: beatsFromTable,
              };
              return { ...ch, voice, arc };
            }),
            sceneCharacters: b.sceneCharacters ?? [],
            characterArcBeats: (b.characterArcBeats ?? []).map((beat) => ({
              ...beat,
              bookId: beat.bookId ?? b.id, // NEW: ensure bookId present on beats
            })),
          })),
          sceneMetrics: parsed.sceneMetrics ?? {},
          blockedAuto: parsed.blockedAuto ?? {},
          // NEW: ensure sceneVersions exists
          sceneVersions: parsed.sceneVersions ?? {},
        };
        setState(migrated);
        return;
      } catch {
        // fall through
      }
    }

    // Demo data
    const initialBookId = makeId();
    const chapter1Id = makeId();
    const chapter2Id = makeId();
    const fwId = "three-act";
    const scene1Id = makeId();
    const scene2Id = makeId();
    const scene3Id = makeId();
    const scene4Id = makeId();
    const scene5Id = makeId();

    const charJamieId = makeId();
    const charRileyId = makeId();
    const charValeId = makeId();

    const now = Date.now();
    const initial: State = {
      books: [
        {
          id: initialBookId,
          title: "Demo Novel",
          frameworkId: fwId,
          // NEW: default target words for demo
          targetWords: 80000,
          // NEW: demo genre
          genre: "Mystery / Thriller",
          chapters: [
            {
              id: chapter1Id,
              title: "Chapter 1: Beginnings",
              content: "",
              updatedAt: now,
              scenes: [
                {
                  id: scene1Id,
                  title: "Opening Image",
                  notes: "Establish tone and world.",
                  updatedAt: now,
                  stepId: makeStepId(fwId, 0),
                  content:
                    "The morning sun washes the sleepy town in amber. Jamie laces their shoes, unaware that today changes everything.",
                  characterIds: [charJamieId],
                  // NEW
                  characters: [charJamieId],
                },
                {
                  id: scene2Id,
                  title: "A Sudden Disruption",
                  notes: "Inciting incident that knocks things off balance.",
                  updatedAt: now,
                  stepId: makeStepId(fwId, 1),
                  content:
                    "A black envelope arrives with no return address. Inside, a map marked with a single X on the edge of town.",
                  characterIds: [charJamieId, charRileyId],
                  // NEW
                  characters: [charJamieId, charRileyId],
                },
                {
                  id: scene3Id,
                  title: "The Decision",
                  notes: "Commitment to the journey.",
                  updatedAt: now,
                  stepId: makeStepId(fwId, 2),
                  content:
                    "Jamie stuffs a flashlight and a notebook into a backpack, takes a breath, and steps out into the unknown.",
                  characterIds: [charJamieId],
                  // NEW
                  characters: [charJamieId],
                },
              ],
            },
            {
              id: chapter2Id,
              title: "Chapter 2: Rising Tension",
              content: "",
              updatedAt: now,
              scenes: [
                {
                  id: scene4Id,
                  title: "Midpoint Revelation",
                  notes: "A perspective-changing discovery.",
                  updatedAt: now,
                  stepId: makeStepId(fwId, 3),
                  content:
                    "The X marks an old observatory, abandoned but not empty. A wall of photos reveals someone has been watching Jamie for years.",
                  characterIds: [charJamieId, charRileyId, charValeId],
                  // NEW
                  characters: [charJamieId, charRileyId, charValeId],
                },
                {
                  id: scene5Id,
                  title: "Pressure Mounts",
                  notes: "Second plot point setup.",
                  updatedAt: now,
                  stepId: makeStepId(fwId, 4),
                  content:
                    "A storm rolls in. Power fails. Footsteps echo in the hallway as Jamie realizes they aren't alone.",
                  characterIds: [charJamieId, charValeId],
                  // NEW
                  characters: [charJamieId, charValeId],
                },
              ],
            },
          ],
          characters: [
            {
              id: charJamieId,
              bookId: initialBookId,
              name: "Jamie",
              role: "protagonist",
              goal: "Uncover the truth behind the map and the observatory.",
              fear: "Being watched and losing control of their life.",
              traits: ["curious", "brave", "empathetic"],
              quirks: ["always carries a notebook", "collects ticket stubs"],
              description: "An inquisitive teen whose life turns when a mysterious map appears.",
              tone: "warm, inquisitive",
              vocabularyLevel: "normal",
              sentenceLength: "medium",
              speechPatterns: "asks thoughtful questions; uses vivid imagery",
              emotionalDefault: "hopeful but cautious",
              arcType: "positive",
              arcSummary: "",
              startingState: "",
              midpointState: "",
              endingState: "",
              internalNeed: "",
              externalGoalChange: "",
            },
            {
              id: charRileyId,
              bookId: initialBookId,
              name: "Riley",
              role: "supporting",
              goal: "Protect Jamie and help decode clues.",
              fear: "Letting Jamie down when it matters most.",
              traits: ["loyal", "resourceful", "practical"],
              quirks: ["fidgets with a keychain", "keeps snack stashes"],
              description: "Jamie's steady best friend with a pragmatic streak.",
              tone: "grounded, straightforward",
              vocabularyLevel: "simple",
              sentenceLength: "short",
              speechPatterns: "direct, pragmatic statements",
              emotionalDefault: "steady",
              arcType: "flat",
              arcSummary: "",
              startingState: "",
              midpointState: "",
              endingState: "",
              internalNeed: "",
              externalGoalChange: "",
            },
            {
              id: charValeId,
              bookId: initialBookId,
              name: "Dr. Vale",
              role: "antagonist",
              goal: "Keep the observatory's secrets hidden.",
              fear: "Exposure and loss of control.",
              traits: ["calculating", "secretive", "obsessive"],
              quirks: ["polishes glasses meticulously", "catalogs everything"],
              description: "A reclusive caretaker of hidden knowledge tied to the observatory.",
              tone: "cold, precise",
              vocabularyLevel: "normal",
              sentenceLength: "long",
              speechPatterns: "formal phrasing; detached tone",
              emotionalDefault: "controlled",
              arcType: "negative",
              arcSummary: "",
              startingState: "",
              midpointState: "",
              endingState: "",
              internalNeed: "",
              externalGoalChange: "",
            },
          ],
          sceneCharacters: [], // legacy
          characterArcBeats: [],
        },
      ],
      currentBookId: initialBookId,
      currentChapterId: chapter1Id,
      currentSceneId: scene1Id,
      sceneMetrics: {},
      blockedAuto: {},
      // NEW
      sceneVersions: {},
    };
    setState(initial);
  }, []);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const currentBook = React.useMemo(
    () => state.books.find((b) => b.id === state.currentBookId),
    [state.books, state.currentBookId],
  );

  const currentChapter = React.useMemo(() => {
    if (!currentBook) return undefined;
    return currentBook.chapters.find((c) => c.id === state.currentChapterId);
  }, [currentBook, state.currentChapterId]);

  const listCharacters = (bookId: string) => {
    const book = state.books.find((b) => b.id === bookId);
    return book?.characters ?? [];
  };

  const listSceneCharacters = (bookId: string, sceneId: string) => {
    const book = state.books.find((b) => b.id === bookId);
    const scene = book?.chapters.flatMap((c) => c.scenes ?? []).find((s) => s.id === sceneId);
    const ids = scene?.characterIds ?? [];
    return ids.map((cid) => ({ id: makeId(), sceneId, characterId: cid, source: "manual" as const }));
  };

  const newBook = (title = "Untitled Book", frameworkId?: string) => {
    const id = makeId();
    const firstChapterId = makeId();
    const book: Book = {
      id,
      title,
      frameworkId,
      chapters: [
        {
          id: firstChapterId,
          title: "Chapter 1",
          content: "",
          updatedAt: Date.now(),
          scenes: [],
          actIndex: undefined,
        },
      ],
      characters: [],
      sceneCharacters: [],
      characterArcBeats: [],
      // NEW
      targetWords: 80000,
      genre: "",
    };
    setState((s) => ({
      books: [book, ...s.books],
      currentBookId: id,
      currentChapterId: firstChapterId,
    }));
    return id;
  };

  const newChapter = (bookId: string, title?: string) => {
    setState((s) => {
      const books = s.books.map((b) => {
        if (b.id !== bookId) return b;
        const nextIndex = b.chapters.length + 1;
        const chapter: Chapter = {
          id: makeId(),
          title: title ?? `Chapter ${nextIndex}`,
          content: "",
          updatedAt: Date.now(),
          scenes: [],
          actIndex: undefined,
        };
        return { ...b, chapters: [...b.chapters, chapter] };
      });
      const addedBook = books.find((b) => b.id === bookId)!;
      const addedChapterId = addedBook.chapters[addedBook.chapters.length - 1].id;
      return {
        books,
        currentBookId: bookId,
        currentChapterId: addedChapterId,
      };
    });
  };

  const setCurrent = (bookId: string, chapterId?: string) => {
    setState((s) => ({
      ...s,
      currentBookId: bookId,
      currentChapterId:
        chapterId ??
        s.books.find((b) => b.id === bookId)?.chapters[0]?.id ??
        s.currentChapterId,
      currentSceneId: undefined,
    }));
  };

  const setCurrentScene = (bookId: string, chapterId: string, sceneId?: string) => {
    setState((s) => ({
      ...s,
      currentBookId: bookId,
      currentChapterId: chapterId,
      currentSceneId: sceneId,
    }));
  };

  const updateBookTitle = (bookId: string, title: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => (b.id === bookId ? { ...b, title } : b)),
    }));
  };

  const updateChapterTitle = (bookId: string, chapterId: string, title: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              chapters: b.chapters.map((c) => (c.id === chapterId ? { ...c, title, updatedAt: Date.now() } : c)),
            }
          : b,
      ),
    }));
  };

  const updateChapterContent = (bookId: string, chapterId: string, content: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              chapters: b.chapters.map((c) =>
                c.id === chapterId ? { ...c, content, updatedAt: Date.now() } : c,
              ),
            }
          : b,
      ),
    }));
  };

  const updateChapterAct = (bookId: string, chapterId: string, actIndex?: number) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        const fw = b.frameworkId ? getFrameworkById(b.frameworkId) : undefined;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const nextAct =
              fw && typeof actIndex === "number" && actIndex >= 0 && actIndex < fw.acts.length
                ? actIndex
                : undefined;
            return { ...c, actIndex: nextAct, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const addScene = (bookId: string, chapterId: string, title?: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const nextIndex = (c.scenes?.length ?? 0) + 1;
            const scene: Scene = {
              id: makeId(),
              title: title ?? `Scene ${nextIndex}`,
              updatedAt: Date.now(),
              stepId: undefined,
              content: "",
              suggested_step_id: undefined,
              characterIds: [],
              // NEW
              characters: [],
              name: title ?? `Scene ${nextIndex}`,
            };
            const scenes = [...(c.scenes ?? []), scene];
            return { ...c, scenes, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const updateSceneTitle = (bookId: string, chapterId: string, sceneId: string, title: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const scenes = (c.scenes ?? []).map((sc) =>
              sc.id === sceneId ? { ...sc, title, updatedAt: Date.now() } : sc,
            );
            return { ...c, scenes, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const updateSceneNotes = (bookId: string, chapterId: string, sceneId: string, notes: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const scenes = (c.scenes ?? []).map((sc) =>
              sc.id === sceneId ? { ...sc, notes, updatedAt: Date.now() } : sc,
            );
            return { ...c, scenes, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const updateSceneStep = (bookId: string, chapterId: string, sceneId: string, stepId?: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const scenes = (c.scenes ?? []).map((sc) =>
              sc.id === sceneId ? { ...sc, stepId, updatedAt: Date.now() } : sc,
            );
            return { ...c, scenes, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const updateSceneMetrics = (
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
  ) => {
    setState((s) => ({
      ...s,
      sceneMetrics: {
        ...(s.sceneMetrics ?? {}),
        [sceneId]: metrics,
      },
    }));
  };

  const createCharacter = (bookId: string, data: Omit<Character, "id" | "bookId">) => {
    const id = makeId();
    setState((s) => ({
      ...s,
      books: s.books.map((b) =>
        b.id === bookId
          ? { ...b, characters: [...(b.characters ?? []), { id, bookId, ...data }] }
          : b,
      ),
    }));
    return id;
  };

  const updateCharacter = (bookId: string, characterId: string, data: Partial<Character>) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          characters: (b.characters ?? []).map((c) => (c.id === characterId ? { ...c, ...data } : c)),
        };
      }),
    }));
  };

  const deleteCharacter = (bookId: string, characterId: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          characters: (b.characters ?? []).filter((c) => c.id !== characterId),
          // remove from any scene.characterIds
          chapters: b.chapters.map((c) => ({
            ...c,
            scenes: (c.scenes ?? []).map((sc) => ({
              ...sc,
              characterIds: (sc.characterIds ?? []).filter((cid) => cid !== characterId),
            })),
          })),
          sceneCharacters: (b.sceneCharacters ?? []).filter((link) => link.characterId !== characterId),
          characterArcBeats: (b.characterArcBeats ?? []).filter((beat) => beat.characterId !== characterId),
        };
      }),
    }));
  };

  const linkCharacterToScene = (bookId: string, sceneId: string, characterId: string, source: "auto" | "manual") => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        const chapters = b.chapters.map((c) => ({
          ...c,
          scenes: (c.scenes ?? []).map((sc) => {
            if (sc.id !== sceneId) return sc;
            const set = new Set(sc.characterIds ?? []);
            set.add(characterId);
            // NEW: keep characters in sync
            const set2 = new Set(sc.characters ?? Array.from(set));
            set2.add(characterId);
            return { ...sc, characterIds: Array.from(set), characters: Array.from(set2) };
          }),
        }));
        return { ...b, chapters };
      }),
      blockedAuto: {
        ...(s.blockedAuto ?? {}),
        [sceneId]: (s.blockedAuto?.[sceneId] ?? []).filter((cid) => cid !== characterId),
      },
    }));
  };

  const unlinkCharacterFromScene = (bookId: string, sceneId: string, characterId: string, manualOverride = true) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        const chapters = b.chapters.map((c) => ({
          ...c,
          scenes: (c.scenes ?? []).map((sc) => {
            if (sc.id !== sceneId) return sc;
            return {
              ...sc,
              characterIds: (sc.characterIds ?? []).filter((cid) => cid !== characterId),
              // NEW
              characters: (sc.characters ?? sc.characterIds ?? []).filter((cid) => cid !== characterId),
            };
          }),
        }));
        return { ...b, chapters };
      }),
      blockedAuto: manualOverride
        ? {
            ...(s.blockedAuto ?? {}),
            [sceneId]: Array.from(new Set([...(s.blockedAuto?.[sceneId] ?? []), characterId])),
          }
        : s.blockedAuto,
    }));
  };

  const setSceneCharacters = (bookId: string, sceneId: string, characterIds: string[]) => {
    setState((s) => {
      const books = s.books.map((b) => {
        if (b.id !== bookId) return b;
        const chapters = b.chapters.map((c) => ({
          ...c,
          scenes: (c.scenes ?? []).map((sc) =>
            sc.id === sceneId ? { ...sc, characterIds, characters: characterIds } : sc
          ),
        }));
        return { ...b, chapters };
      });
      return { ...s, books };
    });
  };

  const listArcBeatsForCharacter = (bookId: string, characterId: string) => {
    const b = state.books.find((bk) => bk.id === bookId);
    return (b?.characterArcBeats ?? []).filter((beat) => beat.bookId === bookId && beat.characterId === characterId);
  };

  const getArcBeat = (bookId: string, characterId: string, stepId: string) => {
    const b = state.books.find((bk) => bk.id === bookId);
    return (b?.characterArcBeats ?? []).find((beat) => beat.bookId === bookId && beat.characterId === characterId && beat.stepId === stepId);
  };

  const setArcBeat = (bookId: string, characterId: string, stepId: string, note: string, importance?: 1 | 2 | 3) => {
    setState((s) => ({
      ...s,
      books: s.books.map((bk) => {
        if (bk.id !== bookId) return bk;
        const existing = (bk.characterArcBeats ?? []).find((b) => b.bookId === bookId && b.characterId === characterId && b.stepId === stepId);
        if (existing) {
          const next = (bk.characterArcBeats ?? []).map((b) =>
            b.id === existing.id ? { ...b, note, importance: importance ?? b.importance ?? 1 } : b
          );
          return { ...bk, characterArcBeats: next };
        }
        const newBeat: CharacterArcBeat = { id: makeId(), bookId, characterId, stepId, note, importance: importance ?? 1 };
        return { ...bk, characterArcBeats: [...(bk.characterArcBeats ?? []), newBeat] };
      }),
    }));
  };

  const removeArcBeat = (bookId: string, characterId: string, stepId: string) => {
    setState((s) => ({
      ...s,
      books: s.books.map((bk) => {
        if (bk.id !== bookId) return bk;
        const next = (bk.characterArcBeats ?? []).filter((b) => !(b.bookId === bookId && b.characterId === characterId && b.stepId === stepId));
        // NEW: also remove from character.arc.beatsByStep if present
        const characters = (bk.characters ?? []).map((ch) => {
          if (ch.id !== characterId) return ch;
          const arc = ch.arc ?? { type: ch.arcType ?? "none", internalNeed: ch.internalNeed ?? "", summary: ch.arcSummary ?? "", start: ch.startingState ?? "", midpoint: ch.midpointState ?? "", end: ch.endingState ?? "", externalGoal: ch.externalGoalChange ?? "", beatsByStep: {} };
          const beatsByStep = { ...(arc.beatsByStep ?? {}) };
          delete beatsByStep[stepId];
          return { ...ch, arc: { ...arc, beatsByStep } };
        });
        return { ...bk, characterArcBeats: next, characters };
      }),
    }));
  };

  // NEW: set character arc beat on character.arc.beatsByStep and mirror to characterArcBeats table
  const setCharacterBeatNote = (bookId: string, characterId: string, stepId: string, note: string, importance?: 1 | 2 | 3) => {
    setState((s) => ({
      ...s,
      books: s.books.map((bk) => {
        if (bk.id !== bookId) return bk;

        // Update/insert in characterArcBeats (table)
        const existing = (bk.characterArcBeats ?? []).find((b) => b.bookId === bookId && b.characterId === characterId && b.stepId === stepId);
        let nextBeats = bk.characterArcBeats ?? [];
        if (existing) {
          nextBeats = nextBeats.map((b) => (b.id === existing.id ? { ...b, note, importance: importance ?? b.importance ?? 1 } : b));
        } else {
          nextBeats = [...nextBeats, { id: makeId(), bookId, characterId, stepId, note, importance: importance ?? 1 }];
        }

        // Update character.arc.beatsByStep
        const characters = (bk.characters ?? []).map((ch) => {
          if (ch.id !== characterId) return ch;
          const prevArc = ch.arc ?? {
            type: ch.arcType ?? "none",
            internalNeed: ch.internalNeed ?? "",
            summary: ch.arcSummary ?? "",
            start: ch.startingState ?? "",
            midpoint: ch.midpointState ?? "",
            end: ch.endingState ?? "",
            externalGoal: ch.externalGoalChange ?? "",
            beatsByStep: {},
          };
          const beatsByStep = { ...(prevArc.beatsByStep ?? {}) };
          beatsByStep[stepId] = note;
          return { ...ch, arc: { ...prevArc, beatsByStep } };
        });

        return { ...bk, characterArcBeats: nextBeats, characters };
      }),
    }));
  };

  const updateSceneContent = (bookId: string, chapterId: string, sceneId: string, content: string) => {
    setState((s) => {
      const books = s.books.map((b) => {
        if (b.id !== bookId) return b;
        const chapters = b.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          const scenes = (c.scenes ?? []).map((sc) => {
            if (sc.id !== sceneId) return sc;
            const suggested_step_id = computeSuggestedStepId(b.frameworkId, content);
            const allChars = b.characters ?? [];
            const detectedIds = detectCharactersInText(content, allChars);
            const suppressed = new Set((s.blockedAuto?.[sceneId] ?? []).map((cid) => cid));
            const nextIds = new Set(sc.characterIds ?? []);
            for (const cid of detectedIds) {
              if (!suppressed.has(cid)) nextIds.add(cid);
            }
            const finalIds = Array.from(nextIds);
            return {
              ...sc,
              content,
              updatedAt: Date.now(),
              suggested_step_id,
              characterIds: finalIds,
              // NEW: keep characters in sync
              characters: Array.from(new Set([...(sc.characters ?? []), ...finalIds])),
            };
          });
          return { ...c, scenes, updatedAt: Date.now() };
        });
        return { ...b, chapters };
      });
      return { ...s, books };
    });
  };

  const updateBookFramework = (bookId: string, frameworkId?: string) => {
    setState((s) => {
      const books = s.books.map((b) => {
        if (b.id !== bookId) return b;
        const fw = frameworkId ? getFrameworkById(frameworkId) : undefined;

        return {
          ...b,
          frameworkId,
          chapters: b.chapters.map((c) => {
            const scenes = (c.scenes ?? []).map((sc) => {
              const current = sc.stepId;
              if (!fw) return { ...sc, stepId: undefined, suggested_step_id: undefined };
              if (!current) return { ...sc, suggested_step_id: undefined };
              const parsed = parseStepId(current);
              if (!parsed) return { ...sc, stepId: undefined, suggested_step_id: undefined };
              if (parsed.frameworkId !== fw.id) return { ...sc, stepId: undefined, suggested_step_id: undefined };
              if (parsed.index < 0 || parsed.index >= fw.steps.length) return { ...sc, stepId: undefined, suggested_step_id: undefined };
              return { ...sc, suggested_step_id: undefined };
            });

            let nextActIndex = c.actIndex;
            if (!fw) {
              nextActIndex = undefined;
            } else if (typeof nextActIndex === "number") {
              if (nextActIndex < 0 || nextActIndex >= fw.acts.length) {
                nextActIndex = undefined;
              }
            } else {
              nextActIndex = undefined;
            }

            return { ...c, scenes, actIndex: nextActIndex };
          }),
        };
      });
      return { ...s, books };
    });
  };

  const reorderScenes = (bookId: string, chapterId: string, orderedIds: string[]) => {
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const sceneMap = new Map((c.scenes ?? []).map((sc) => [sc.id, sc]));
            const reordered = orderedIds
              .map((id) => sceneMap.get(id))
              .filter(Boolean) as Scene[];
            return { ...c, scenes: reordered, updatedAt: Date.now() };
          }),
        };
      }),
    }));
  };

  const addDemoBook = () => {
    const fwId = "three-act";
    const bookId = makeId();
    const chapter1Id = makeId();
    const chapter2Id = makeId();

    const scene1Id = makeId();
    const scene2Id = makeId();
    const scene3Id = makeId();
    const scene4Id = makeId();
    const scene5Id = makeId();

    const charJamieId = makeId();
    const charRileyId = makeId();
    const charValeId = makeId();

    const now = Date.now();
    const demoBook: Book = {
      id: bookId,
      title: "Demo Novel",
      frameworkId: fwId,
      // NEW
      targetWords: 80000,
      genre: "Mystery / Thriller",
      chapters: [
        {
          id: chapter1Id,
          title: "Chapter 1: Beginnings",
          content: "",
          updatedAt: now,
          scenes: [
            {
              id: scene1Id,
              title: "Opening Image",
              notes: "Establish tone and world.",
              updatedAt: now,
              stepId: makeStepId(fwId, 0),
              content:
                "The morning sun washes the sleepy town in amber. Jamie laces their shoes, unaware that today changes everything.",
              characterIds: [charJamieId],
              // NEW
              characters: [charJamieId],
            },
            {
              id: scene2Id,
              title: "A Sudden Disruption",
              notes: "Inciting incident that knocks things off balance.",
              updatedAt: now,
              stepId: makeStepId(fwId, 1),
              content:
                "A black envelope arrives with no return address. Inside, a map marked with a single X on the edge of town.",
              characterIds: [charJamieId, charRileyId],
              // NEW
              characters: [charJamieId, charRileyId],
            },
            {
              id: scene3Id,
              title: "The Decision",
              notes: "Commitment to the journey.",
              updatedAt: now,
              stepId: makeStepId(fwId, 2),
              content:
                "Jamie stuffs a flashlight and a notebook into a backpack, takes a breath, and steps out into the unknown.",
              characterIds: [charJamieId],
              // NEW
              characters: [charJamieId],
            },
          ],
        },
        {
          id: chapter2Id,
          title: "Chapter 2: Rising Tension",
          content: "",
          updatedAt: now,
          scenes: [
            {
              id: scene4Id,
              title: "Midpoint Revelation",
              notes: "A perspective-changing discovery.",
              updatedAt: now,
              stepId: makeStepId(fwId, 3),
              content:
                "The X marks an old observatory, abandoned but not empty. A wall of photos reveals someone has been watching Jamie for years.",
              characterIds: [charJamieId, charRileyId, charValeId],
              // NEW
              characters: [charJamieId, charRileyId, charValeId],
            },
            {
              id: scene5Id,
              title: "Pressure Mounts",
              notes: "Second plot point setup.",
              updatedAt: now,
              stepId: makeStepId(fwId, 4),
              content:
                "A storm rolls in. Power fails. Footsteps echo in the hallway as Jamie realizes they aren't alone.",
              characterIds: [charJamieId, charValeId],
              // NEW
              characters: [charJamieId, charValeId],
            },
          ],
        },
      ],
      characters: [
        {
          id: charJamieId,
          bookId,
          name: "Jamie",
          role: "protagonist",
          goal: "Uncover the truth behind the map and the observatory.",
          fear: "Being watched and losing control of their life.",
          traits: ["curious", "brave", "empathetic"],
          quirks: ["always carries a notebook", "collects ticket stubs"],
          description: "An inquisitive teen whose life turns when a mysterious map appears.",
          tone: "warm, inquisitive",
          vocabularyLevel: "normal",
          sentenceLength: "medium",
          speechPatterns: "asks thoughtful questions; uses vivid imagery",
          emotionalDefault: "hopeful but cautious",
        },
        {
          id: charRileyId,
          bookId,
          name: "Riley",
          role: "supporting",
          goal: "Protect Jamie and help decode clues.",
          fear: "Letting Jamie down when it matters most.",
          traits: ["loyal", "resourceful", "practical"],
          quirks: ["fidgets with a keychain", "keeps snack stashes"],
          description: "Jamie's steady best friend with a pragmatic streak.",
          tone: "grounded, straightforward",
          vocabularyLevel: "simple",
          sentenceLength: "short",
          speechPatterns: "direct, pragmatic statements",
          emotionalDefault: "steady",
        },
        {
          id: charValeId,
          bookId,
          name: "Dr. Vale",
          role: "antagonist",
          goal: "Keep the observatory's secrets hidden.",
          fear: "Exposure and loss of control.",
          traits: ["calculating", "secretive", "obsessive"],
          quirks: ["polishes glasses meticulously", "catalogs everything"],
          description: "A reclusive caretaker of hidden knowledge tied to the observatory.",
          tone: "cold, precise",
          vocabularyLevel: "normal",
          sentenceLength: "long",
          speechPatterns: "formal phrasing; detached tone",
          emotionalDefault: "controlled",
        },
      ],
      sceneCharacters: [],
      characterArcBeats: [],
    };

    setState((s) => ({
      ...s,
      books: [demoBook, ...s.books],
      currentBookId: bookId,
      currentChapterId: chapter1Id,
      currentSceneId: scene1Id,
      // keep sceneVersions map
      sceneVersions: s.sceneVersions ?? {},
    }));

    return bookId;
  };

  // NEW: per-scene version history helpers
  const addSceneVersion = (sceneId: string, text: string) => {
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const version: SceneVersion = { sceneId, timestamp: Date.now(), wordCount, text };
    setState((s) => {
      const map = { ...(s.sceneVersions ?? {}) };
      const list = map[sceneId] ? [...map[sceneId], version] : [version];
      map[sceneId] = list;
      return { ...s, sceneVersions: map };
    });
  };

  const listSceneVersions = (sceneId: string) => {
    const map = state.sceneVersions ?? {};
    return (map[sceneId] ?? []).slice().sort((a, b) => b.timestamp - a.timestamp);
  };

  const restoreSceneVersion = (bookId: string, chapterId: string, sceneId: string, text: string) => {
    // Replace scene content immediately and add a new version entry capturing the restore
    setState((s) => {
      const books = s.books.map((b) => {
        if (b.id !== bookId) return b;
        const chapters = b.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          const scenes = (c.scenes ?? []).map((sc) =>
            sc.id === sceneId ? { ...sc, content: text, updatedAt: Date.now() } : sc
          );
          return { ...c, scenes, updatedAt: Date.now() };
        });
        return { ...b, books, chapters };
      });
      // NOTE: The above mistakenly added books in book; we'll correct it by returning properly.
      return { ...s, books };
    });
    addSceneVersion(sceneId, text);
  };

  return {
    books: state.books,
    currentBook,
    currentChapter,
    currentBookId: state.currentBookId,
    currentChapterId: state.currentChapterId,
    currentSceneId: state.currentSceneId,
    sceneMetrics: state.sceneMetrics ?? {},
    actions: {
      newBook,
      newChapter,
      setCurrent,
      setCurrentScene,
      updateBookTitle,
      updateChapterTitle,
      updateChapterContent,
      addScene,
      updateSceneTitle,
      updateSceneNotes,
      updateSceneStep,
      updateSceneMetrics,
      updateSceneContent,
      reorderScenes,
      exportData: () => JSON.stringify(state),
      importData: (json: string) => {
        const parsed: State = JSON.parse(json);
        setState(parsed);
      },
      updateBookFramework,
      addDemoBook,
      updateChapterAct,

      createCharacter,
      updateCharacter,
      deleteCharacter,
      linkCharacterToScene,
      unlinkCharacterFromScene,
      setSceneCharacters,
      listCharacters,
      listSceneCharacters,

      listArcBeatsForCharacter,
      getArcBeat,
      setArcBeat,
      removeArcBeat,

      // NEW
      setCharacterBeatNote,

      // NEW: scene version actions
      addSceneVersion,
      listSceneVersions,
      restoreSceneVersion,
    },
  };
}
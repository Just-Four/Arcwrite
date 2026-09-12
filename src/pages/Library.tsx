"use client";

import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useArcwright } from "@/hooks/use-arcwright";

const Library = () => {
  const navigate = useNavigate();
  const { books, actions } = useArcwright();

  const handleOpen = (bookId: string) => {
    actions.setCurrent(bookId);
    navigate("/");
  };

  const handleNew = () => {
    const id = actions.newBook();
    actions.setCurrent(id);
    navigate("/");
  };

  const totalWords = (book: { chapters: Array<{ content: string; scenes?: Array<{ content?: string }> }> }) => {
    return book.chapters.reduce((sum, ch) => {
      const chWords = (ch.content || "").trim() ? (ch.content || "").trim().split(/\s+/).filter(Boolean).length : 0;
      const scWords = (ch.scenes ?? []).reduce((s2, sc) => s2 + ((sc.content || "").trim() ? (sc.content || "").trim().split(/\s+/).filter(Boolean).length : 0), 0);
      return sum + chWords + scWords;
    }, 0);
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Writer's Vault</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Editor
            </Link>
          </Button>
          <Button onClick={handleNew}>
            <Plus className="mr-1 h-4 w-4" />
            New book
          </Button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          No books yet. Create your first book to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const chapterCount = b.chapters.length;
            const lastUpdated = new Date(
              Math.max(...b.chapters.map((c) => c.updatedAt || 0), 0),
            ).toLocaleString();
            const words = totalWords(b);
            const target = typeof b.targetWords === "number" ? b.targetWords : 80000;
            const pct = Math.min(100, Math.round((words / Math.max(1, target)) * 100));
            return (
              <Card key={b.id} className="flex h-full flex-col">
                <CardHeader className="space-y-1">
                  <CardTitle className="truncate">{b.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{b.genre?.trim() || "—"}</Badge>
                    <div className="text-[11px] text-muted-foreground">Chapters: {chapterCount}</div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Progress</span>
                      <span>{words.toLocaleString()} / {target.toLocaleString()} words</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  <div className="text-xs">Last updated: {lastUpdated}</div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button className="w-full" onClick={() => handleOpen(b.id)}>
                    Open
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;
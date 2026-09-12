"use client";

import * as React from "react";
import { Book, Plus } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import type { Book as BookType, Chapter } from "@/hooks/use-arcwright";

type Props = {
  books: BookType[];
  currentBookId?: string;
  currentChapterId?: string;
  onSelect: (bookId: string, chapterId?: string) => void;
  onNewChapter: (bookId: string) => void;
};

const BookSidebar: React.FC<Props> = ({
  books,
  currentBookId,
  currentChapterId,
  onSelect,
  onNewChapter,
}) => {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2">Books</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {books.map((book) => {
            const isActiveBook = book.id === currentBookId;
            return (
              <SidebarMenuItem key={book.id}>
                <SidebarMenuButton
                  isActive={isActiveBook}
                  onClick={() => onSelect(book.id, book.chapters[0]?.id)}
                  tooltip={book.title}
                >
                  <Book className="text-sidebar-foreground/80" />
                  <span>{book.title}</span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  title="Add chapter"
                  onClick={() => onNewChapter(book.id)}
                  showOnHover
                >
                  <Plus />
                </SidebarMenuAction>
                {book.chapters.length > 0 && (
                  <SidebarMenuSub>
                    {book.chapters.map((chapter: Chapter) => {
                      const isActiveChapter =
                        isActiveBook && chapter.id === currentChapterId;
                      return (
                        <SidebarMenuSubItem key={chapter.id}>
                          <SidebarMenuSubButton
                            isActive={isActiveChapter}
                            onClick={() => onSelect(book.id, chapter.id)}
                          >
                            <span>{chapter.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default BookSidebar;
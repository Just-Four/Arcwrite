"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import type { Character } from "@/hooks/use-arcwright";

type Props = {
  characters: Character[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

const CharacterMultiSelect: React.FC<Props> = ({ characters, selectedIds, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange(Array.from(set));
  };

  const selected = characters.filter((c) => selectedIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">Characters</Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search characters…" />
          <CommandList>
            <CommandEmpty>No characters found.</CommandEmpty>
            <CommandGroup heading="All">
              {characters.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <CommandItem key={c.id} onSelect={() => toggle(c.id)}>
                    <div className={`mr-2 h-3 w-3 rounded-sm border ${checked ? "bg-primary" : ""}`} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.role || ""}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {/* Display selected badges inline for quick glance */}
      <div className="ml-2 flex flex-wrap gap-1">
        {selected.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">None</span>
        ) : (
          selected.map((c) => (
            <Badge key={c.id} variant="secondary">{c.name}</Badge>
          ))
        )}
      </div>
    </Popover>
  );
};

export default CharacterMultiSelect;
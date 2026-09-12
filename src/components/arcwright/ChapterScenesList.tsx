"use client";

import * as React from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type SceneItem = {
  id: string;
  title: string;
  stepId?: string;
};

type SortableSceneProps = {
  scene: SceneItem;
  onRename: (id: string, title: string) => void;
  onSetStep?: (id: string, stepId?: string) => void;
  stepOptions?: { value: string; label: string }[];
  onSelect?: (id: string) => void;
  isSelected?: boolean;
};

const SortableSceneItem: React.FC<SortableSceneProps> = ({ scene, onRename, onSetStep, stepOptions = [], onSelect, isSelected }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-sm px-1 py-1 ${isDragging ? "opacity-80" : ""} ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
      onClick={() => onSelect?.(scene.id)}
    >
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted"
        {...attributes}
        {...listeners}
        aria-label="Drag scene"
        title="Drag scene"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      <Input
        value={scene.title}
        onChange={(e) => onRename(scene.id, e.target.value)}
        onFocus={() => onSelect?.(scene.id)}
        className="h-7 flex-1 text-xs"
        placeholder="Scene title"
      />
      {onSetStep && stepOptions.length > 0 && (
        <div className="w-48">
          <Select
            value={scene.stepId || ""}
            onValueChange={(val) => onSetStep(scene.id, val === "none" ? undefined : val)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Link step" />
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
    </div>
  );
};

type Props = {
  scenes: SceneItem[];
  onRename: (id: string, title: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onSetStep?: (id: string, stepId?: string) => void;
  stepOptions?: { value: string; label: string }[];
  onSelect?: (id: string) => void;
  selectedId?: string;
};

const ChapterScenesList: React.FC<Props> = ({ scenes, onRename, onReorder, onSetStep, stepOptions, onSelect, selectedId }) => {
  const items = scenes.map((s) => s.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(items, oldIndex, newIndex);
    onReorder(newOrder);
  };

  return (
    <div className="mt-1 ml-6 space-y-1">
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {scenes.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">No scenes yet.</div>
          ) : (
            scenes.map((scene) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                onRename={onRename}
                onSetStep={onSetStep}
                stepOptions={stepOptions}
                onSelect={onSelect}
                isSelected={selectedId === scene.id}
              />
            ))
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ChapterScenesList;
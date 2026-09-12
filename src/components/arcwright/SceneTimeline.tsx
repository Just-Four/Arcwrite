"use client";

import * as React from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SceneItem = {
  id: string;
  title: string;
};

type SortableSceneProps = {
  scene: SceneItem;
  onRename: (id: string, title: string) => void;
};

const SortableSceneItem: React.FC<SortableSceneProps> = ({ scene, onRename }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-card px-2 py-2 ${isDragging ? "opacity-80 shadow-sm" : ""}`}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
        {...attributes}
        {...listeners}
        aria-label="Drag scene"
        title="Drag scene"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Input
        value={scene.title}
        onChange={(e) => onRename(scene.id, e.target.value)}
        className="flex-1"
        placeholder="Scene title"
      />
    </div>
  );
};

type Props = {
  scenes: SceneItem[];
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

const SceneTimeline: React.FC<Props> = ({ scenes, onAdd, onRename, onReorder }) => {
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
    <div className="w-full">
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Scenes</span>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add scene
        </Button>
      </div>
      <Separator />
      <div className="mt-2 space-y-2">
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {scenes.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">No scenes yet. Add one to start.</div>
            ) : (
              scenes.map((scene) => (
                <SortableSceneItem key={scene.id} scene={scene} onRename={onRename} />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default SceneTimeline;
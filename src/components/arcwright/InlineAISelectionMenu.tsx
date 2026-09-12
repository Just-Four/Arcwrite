"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  x: number;
  y: number;
  onRewrite: () => void;
  onExpand: () => void;
  onTighten: () => void;
  onMatchTone: () => void;
  onClose: () => void;
  visible: boolean;
};

const InlineAISelectionMenu: React.FC<Props> = ({
  x,
  y,
  onRewrite,
  onExpand,
  onTighten,
  onMatchTone,
  onClose,
  visible,
}) => {
  if (!visible) return null;

  return (
    <div
      className="fixed z-50 rounded-md border bg-background shadow-md p-1 flex gap-1"
      style={{ left: Math.max(8, x - 10), top: Math.max(8, y - 42) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRewrite}>
        Rewrite
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onExpand}>
        Expand
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onTighten}>
        Tighten
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onMatchTone}>
        Match tone
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClose} aria-label="Close">
        ✕
      </Button>
    </div>
  );
};

export default InlineAISelectionMenu;
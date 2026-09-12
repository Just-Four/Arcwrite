"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { SceneVersion } from "@/hooks/use-arcwright";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: SceneVersion[];
  onRestore: (version: SceneVersion) => void;
};

const formatTs = (ts: number) => new Date(ts).toLocaleString();

const SceneHistoryModal: React.FC<Props> = ({ open, onOpenChange, versions, onRestore }) => {
  const [selected, setSelected] = React.useState<SceneVersion | undefined>(versions[0]);

  React.useEffect(() => {
    setSelected(versions[0]);
  }, [versions, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Scene History</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-1">
                {versions.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No versions yet.</div>
                ) : (
                  versions.map((v) => (
                    <button
                      key={v.timestamp}
                      onClick={() => setSelected(v)}
                      className={`w-full text-left rounded-md px-2 py-1 text-xs transition-colors ${
                        selected?.timestamp === v.timestamp ? "bg-accent" : "hover:bg-accent"
                      }`}
                    >
                      <div className="font-medium">{formatTs(v.timestamp)}</div>
                      <div className="text-muted-foreground">{v.wordCount} words</div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">
                {selected ? `${formatTs(selected.timestamp)} • ${selected.wordCount} words` : "No version selected"}
              </div>
              <Button
                size="sm"
                disabled={!selected}
                onClick={() => selected && onRestore(selected)}
              >
                Restore this version
              </Button>
            </div>
            <Separator />
            <Textarea
              value={selected?.text ?? ""}
              readOnly
              className="mt-2 h-64 text-sm"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SceneHistoryModal;
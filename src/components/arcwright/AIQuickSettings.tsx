"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { showError, showSuccess } from "@/utils/toast";
import { useAI } from "@/hooks/use-ai";

const AIQuickSettings: React.FC = () => {
  const { settings, setSettings, chat } = useAI();
  const [open, setOpen] = React.useState(false);
  const isAIReady = settings.mode === "managed" || (settings.apiKey && settings.apiKey.length > 0);

  const testAI = async () => {
    if (!isAIReady) {
      showError("Add your API key or switch to Managed AI first.");
      return;
    }
    const messages = [
      { role: "system" as const, content: "You are a connection test. Reply with 'ok'." },
      { role: "user" as const, content: "Say ok." },
    ];
    const content = await chat(messages);
    showSuccess(content?.toLowerCase().includes("ok") ? "AI test succeeded" : "AI responded");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">AI</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <div className="mb-2 text-sm font-medium">AI Quick Settings</div>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Mode</div>
            <ToggleGroup
              type="single"
              value={settings.mode ?? "byok"}
              onValueChange={(v) => v && setSettings({ ...settings, mode: v as "byok" | "managed" })}
            >
              <ToggleGroupItem value="byok">BYOK</ToggleGroupItem>
              <ToggleGroupItem value="managed">Managed</ToggleGroupItem>
            </ToggleGroup>
            <div className="mt-1 text-[11px] text-muted-foreground">
              BYOK uses your browser key; Managed uses server keys via Supabase.
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="API key"
              aria-label="AI API key"
            />
            <Input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              aria-label="AI base URL"
            />
            <Input
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="gpt-4o-mini"
              aria-label="AI model"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={testAI}>Test</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSettings({ ...settings, apiKey: "" })}
            >
              Clear key
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Saved locally in your browser and used by Act Review and rewrite tools.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AIQuickSettings;
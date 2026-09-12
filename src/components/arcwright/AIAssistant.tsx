"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showError, showSuccess } from "@/utils/toast";
import { useAI, AIMsg } from "@/hooks/use-ai";
import { Send, Trash2 } from "lucide-react";
import { useArcwright } from "@/hooks/use-arcwright";
import { getFrameworkById, parseStepId } from "@/lib/framework-library";

const systemPrompt =
  "You are Arcwright's helpful writing assistant. Offer concise, practical guidance, suggest scene ideas, character arcs, and stylistic improvements without changing the author's voice.";

const bubbleClasses = (role: AIMsg["role"]) =>
  role === "user"
    ? "bg-primary/10 text-primary border border-primary/20"
    : role === "assistant"
    ? "bg-muted text-muted-foreground border"
    : "bg-secondary/20 text-secondary-foreground border border-secondary";

const AIAssistant: React.FC = () => {
  const { settings, setSettings, chat } = useAI();
  const { currentBook, currentChapter, currentSceneId } = useArcwright();
  const [messages, setMessages] = React.useState<AIMsg[]>([{ role: "system", content: systemPrompt }]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!settings.apiKey) {
      showError("Add your AI API key first.");
      return;
    }
    // Build framework context
    const fw = getFrameworkById(currentBook?.frameworkId);
    let currentStepText = "";
    if (fw && currentChapter) {
      const selectedScene = (currentChapter.scenes ?? []).find(s => s.id === currentSceneId);
      const candidate = selectedScene?.stepId
        ? selectedScene.stepId
        : (currentChapter.scenes ?? []).slice().reverse().find(s => s.stepId)?.stepId;
      const parsed = parseStepId(candidate);
      if (parsed && parsed.frameworkId === fw.id) {
        const step = fw.steps[parsed.index];
        if (step) {
          currentStepText = `Current step: ${parsed.index + 1}. ${step.title} — ${step.purpose} (keywords: ${step.keywords.join(", ")})`;
        }
      }
    }
    const frameworkContext = fw
      ? [
          `Project framework: ${fw.name}`,
          `Acts: ${fw.acts.join(" | ")}`,
          `Steps:`,
          ...fw.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.purpose} [${s.keywords.join(", ")}]`),
          currentStepText || "Current step: (none linked yet)",
        ].join("\n")
      : "Project framework: None";

    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setSending(true);
    const sys = { role: "system" as const, content: `${systemPrompt}\n\n${frameworkContext}` };
    const reply = await chat([sys, ...next.filter(m => m.role !== "system")]);
    setMessages([...next, { role: "assistant", content: reply || "…" }]);
    setInput("");
    setSending(false);
    showSuccess("AI responded");
  };

  const clearChat = () => {
    setMessages([{ role: "system", content: systemPrompt }]);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="rounded-md border p-3">
        <div className="text-sm font-medium">AI settings</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <Input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder="Paste your API key (stored locally)"
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
        <div className="mt-2 text-xs text-muted-foreground">
          Your key is saved only in your browser and included in encrypted backups; for shared, server-managed keys use Supabase.
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex-1 rounded-md border">
        <ScrollArea className="h-[240px] p-3">
          <div className="space-y-2">
            {messages
              .filter((m) => m.role !== "system")
              .map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-md border px-3 py-2 text-sm ${bubbleClasses(m.role)}`}
                >
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
                    {m.role}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            {messages.filter((m) => m.role !== "system").length === 0 && (
              <div className="text-sm text-muted-foreground">
                Start a conversation with your writing assistant.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for ideas, feedback, or help outlining a scene…"
            className="min-h-[60px] flex-1"
          />
          <div className="flex flex-col gap-2">
            <Button onClick={sendMessage} disabled={sending || !input.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
            <Button variant="outline" onClick={clearChat}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
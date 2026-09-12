"use client";

import * as React from "react";

export type AIMsg = { role: "system" | "user" | "assistant"; content: string };
export type AISettings = {
  apiKey: string;
  baseUrl: string; // e.g. https://api.openai.com/v1
  model: string; // e.g. gpt-4o-mini
  mode?: "managed" | "byok"; // NEW: managed via Supabase Edge vs BYOK
};

const STORAGE_KEY = "arcwright_ai_settings";

const defaultSettings: AISettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  mode: "byok",
};

export function useAI() {
  const [settings, setSettings] = React.useState<AISettings>(defaultSettings);

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AISettings;
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // ignore corrupted state
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const chat = async (messages: AIMsg[]): Promise<string> => {
    const { apiKey, baseUrl, model, mode = "byok" } = settings;

    if (mode === "managed") {
      // Call our Edge Function. Provider keys live in Supabase secrets.
      const { invokeAIComplete } = await import("@/lib/supabase");
      const data = await invokeAIComplete(messages, model);
      const content = (data?.content ?? "").toString();
      return content;
    }

    if (!apiKey) {
      throw new Error("No API key set. Add your key in Assistant > AI settings or switch to Managed AI.");
    }
    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI request failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content: string =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      "";
    return content;
  };

  return {
    settings,
    setSettings,
    chat,
  };
}

export default useAI;
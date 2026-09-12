"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { encryptString } from "@/utils/crypto";

export function getSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return createClient(url, anon);
}

export async function invokeAIComplete(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, modelOverride?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("ai/complete", {
    body: { messages, modelOverride },
  });
  if (error) {
    throw new Error(error.message);
  }
  // Expect data = { content: string, usage?: { prompt_tokens, completion_tokens, total_tokens } }
  return data;
}

export async function requestEpubExport(payload: { bookId: string; title: string }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("export/epub", {
    body: payload,
  });
  if (error) {
    throw new Error(error.message);
  }
  // Expect data = { storagePath: string }
  return data;
}

export async function uploadEncryptedJSONToStorage(params: {
  bucket: string;
  path: string; // e.g. exports/backup.arcw
  json: string;
  password: string;
}) {
  const supabase = getSupabase();
  const encrypted = await encryptString(params.json, params.password);
  const blob = new Blob([encrypted], { type: "application/json" });
  const { data, error } = await supabase.storage.from(params.bucket).upload(params.path, blob, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data?.path ?? params.path;
}
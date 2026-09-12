"use client";

import { getSupabase } from "@/lib/supabase";

export type Embedding = number[];
export type SearchResult = { id: string; docId?: string; score: number; content?: string };

export type VectorProvider = "pgvector" | "qdrant";

type VectorConfig =
  | {
      provider: "pgvector";
      table: string; // default: embeddings
      matchFn?: string; // optional RPC function name, default 'match_embeddings'
      threshold?: number; // default 0.8
    }
  | {
      provider: "qdrant";
      url: string; // e.g. https://qdrant.your-host:6333
      apiKey?: string;
      collection: string; // e.g. arcwright
    };

const CONFIG_KEY = "vector_config";

function getConfig(): VectorConfig {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as VectorConfig;
    } catch {
      // fall through to default
    }
  }
  return { provider: "pgvector", table: "embeddings", matchFn: "match_embeddings", threshold: 0.8 };
}

export function setConfig(config: VectorConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export interface VectorStore {
  upsertEmbedding(input: { id: string; docId?: string; content?: string; embedding: Embedding }): Promise<void>;
  queryEmbedding(input: { embedding: Embedding; k: number }): Promise<SearchResult[]>;
}

class PgVectorStore implements VectorStore {
  async upsertEmbedding(input: { id: string; docId?: string; content?: string; embedding: Embedding }): Promise<void> {
    const cfg = getConfig() as Extract<VectorConfig, { provider: "pgvector" }>;
    const supabase = getSupabase();
    // Assumes a table with columns: id (uuid/text), doc_id (text), content (text), embedding (vector)
    const { error } = await supabase.from(cfg.table).upsert({
      id: input.id,
      doc_id: input.docId ?? input.id,
      content: input.content ?? null,
      embedding: input.embedding,
    });
    if (error) throw new Error(error.message);
  }

  async queryEmbedding(input: { embedding: Embedding; k: number }): Promise<SearchResult[]> {
    const cfg = getConfig() as Extract<VectorConfig, { provider: "pgvector" }>;
    const supabase = getSupabase();
    // Prefer calling a RPC that uses pgvector <-> operator.
    const { data, error } = await supabase.rpc(cfg.matchFn ?? "match_embeddings", {
      query_embedding: input.embedding,
      match_threshold: cfg.threshold ?? 0.8,
      match_count: input.k,
    });
    if (error) throw new Error(error.message);
    // Expect data rows: { id, doc_id, content, similarity }
    return (data ?? []).map((row: any) => ({
      id: String(row.id),
      docId: row.doc_id ? String(row.doc_id) : undefined,
      score: typeof row.similarity === "number" ? row.similarity : 0,
      content: row.content ?? undefined,
    }));
  }
}

class QdrantStore implements VectorStore {
  private headers() {
    const cfg = getConfig() as Extract<VectorConfig, { provider: "qdrant" }>;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.apiKey) h["api-key"] = cfg.apiKey;
    return h;
  }

  async upsertEmbedding(input: { id: string; docId?: string; content?: string; embedding: Embedding }): Promise<void> {
    const cfg = getConfig() as Extract<VectorConfig, { provider: "qdrant" }>;
    const res = await fetch(`${cfg.url}/collections/${cfg.collection}/points`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({
        points: [
          {
            id: input.id,
            vector: input.embedding,
            payload: { doc_id: input.docId ?? input.id, content: input.content ?? null },
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Qdrant upsert failed: ${res.status} ${await res.text()}`);
  }

  async queryEmbedding(input: { embedding: Embedding; k: number }): Promise<SearchResult[]> {
    const cfg = getConfig() as Extract<VectorConfig, { provider: "qdrant" }>;
    const res = await fetch(`${cfg.url}/collections/${cfg.collection}/points/search`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ vector: input.embedding, limit: input.k }),
    });
    if (!res.ok) throw new Error(`Qdrant search failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data ?? []).map((hit: any) => ({
      id: String(hit.id),
      docId: hit.payload?.doc_id ? String(hit.payload.doc_id) : undefined,
      score: typeof hit.score === "number" ? hit.score : 0,
      content: hit.payload?.content ?? undefined,
    }));
  }
}

export function getVectorStore(): VectorStore {
  const cfg = getConfig();
  return cfg.provider === "qdrant" ? new QdrantStore() : new PgVectorStore();
}
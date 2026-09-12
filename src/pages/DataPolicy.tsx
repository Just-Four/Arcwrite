"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSupabase } from "@/lib/supabase";

const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const DataPolicy: React.FC = () => {
  const handleErase = async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke("erase/account", { body: {} });
    if (error) throw new Error(error.message);
    return data;
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Flow & Retention (EU)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <strong>Local-first:</strong> Your manuscripts and project data are stored locally in your browser. Exports are optional.
          </div>
          <div>
            <strong>Supabase (EU region):</strong> Auth and Postgres run with strict RLS. Storage is used only for exports/covers, encrypted client-side before upload.
          </div>
          <div>
            <strong>AI:</strong> Managed AI runs through our Edge Function with provider keys stored in Supabase secrets. BYOK runs directly in your browser; some structured/voice features are limited.
          </div>
          <div>
            <strong>Vectors:</strong> We abstract vectors. Default is Postgres+pgvector; you can switch to Qdrant via settings without vendor lock-in.
          </div>
          <div>
            <strong>Metrics:</strong> We only log anonymised counters (e.g. tokens, feature flags) in Postgres — never raw manuscript text.
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Button onClick={handleErase} disabled={!hasSupabase}>
              Request right-to-erasure
            </Button>
            {!hasSupabase && (
              <span className="text-xs text-muted-foreground">
                Supabase not configured. Add Supabase to enable erasure requests.
              </span>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            The erasure endpoint will delete your account-related data and storage objects. Encrypted local backups remain on your device.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataPolicy;
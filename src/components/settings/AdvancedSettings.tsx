"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useAI } from "@/hooks/use-ai";
import { setConfig } from "@/lib/vector-store";
import { showSuccess } from "@/utils/toast";

const AdvancedSettings: React.FC = () => {
  const { settings, setSettings } = useAI();
  const [provider, setProvider] = React.useState<"pgvector" | "qdrant">(() => {
    try {
      const raw = localStorage.getItem("vector_config");
      const cfg = raw ? JSON.parse(raw) : null;
      return (cfg?.provider as "pgvector" | "qdrant") ?? "pgvector";
    } catch {
      return "pgvector";
    }
  });
  const [qdrantUrl, setQdrantUrl] = React.useState("");
  const [qdrantKey, setQdrantKey] = React.useState("");
  const [qdrantCollection, setQdrantCollection] = React.useState("arcwright");

  const saveVectorConfig = () => {
    if (provider === "qdrant") {
      setConfig({ provider: "qdrant", url: qdrantUrl, apiKey: qdrantKey || undefined, collection: qdrantCollection });
    } else {
      setConfig({ provider: "pgvector", table: "embeddings", matchFn: "match_embeddings", threshold: 0.8 });
    }
    showSuccess("Vector settings saved");
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">AI mode</div>
        <div className="mt-2 flex items-center gap-3">
          <Label htmlFor="managed-ai">Managed AI (Supabase Edge)</Label>
          <Switch
            id="managed-ai"
            checked={settings.mode === "managed"}
            onCheckedChange={(checked) => setSettings({ ...settings, mode: checked ? "managed" : "byok" })}
          />
          <span className="text-xs text-muted-foreground">
            BYOK limits structured and voice features. Managed AI uses provider keys in Supabase secrets.
          </span>
        </div>
      </div>

      <Separator />

      <div>
        <div className="text-sm font-medium">Vector backend</div>
        <RadioGroup
          value={provider}
          onValueChange={(val) => setProvider(val as "pgvector" | "qdrant")}
          className="mt-2 flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pgvector" id="pgvector" />
            <Label htmlFor="pgvector">Postgres + pgvector (strict RLS)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="qdrant" id="qdrant" />
            <Label htmlFor="qdrant">Qdrant</Label>
          </div>
        </RadioGroup>

        {provider === "qdrant" && (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Input
              value={qdrantUrl}
              onChange={(e) => setQdrantUrl(e.target.value)}
              placeholder="https://qdrant.example.com:6333"
              aria-label="Qdrant URL"
            />
            <Input
              value={qdrantKey}
              onChange={(e) => setQdrantKey(e.target.value)}
              placeholder="Qdrant API key (optional)"
              aria-label="Qdrant API key"
            />
            <Input
              value={qdrantCollection}
              onChange={(e) => setQdrantCollection(e.target.value)}
              placeholder="arcwright"
              aria-label="Qdrant collection"
            />
          </div>
        )}

        <div className="mt-3">
          <Button variant="outline" onClick={saveVectorConfig}>
            Save vector settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
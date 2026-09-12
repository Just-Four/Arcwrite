"use client";

import * as React from "react";
import { Mic, StopCircle, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { downloadTextFile } from "@/utils/download";
import { showSuccess } from "@/utils/toast";
import { encryptString, decryptString } from "@/utils/crypto";
import AIAssistant from "./AIAssistant";
import AdvancedSettings from "@/components/settings/AdvancedSettings";
import StyleTrainer from "./StyleTrainer";

type Props = {
  onExportJSON: () => string;
  onImportJSON: (json: string) => void;
};

const AssistantPanel: React.FC<Props> = ({ onExportJSON, onImportJSON }) => {
  const [note, setNote] = React.useState("");
  const [password, setPassword] = React.useState("");
  const plainFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const encFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExportPlain = () => {
    const json = onExportJSON();
    downloadTextFile("arcwright-backup.json", json);
    showSuccess("Exported backup (JSON)");
  };

  const handleImportPlainFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      onImportJSON(text);
      showSuccess("Imported backup (JSON)");
    };
    reader.readAsText(file);
  };

  const handleExportEncrypted = async () => {
    const json = onExportJSON();
    const enc = await encryptString(json, password);
    downloadTextFile("arcwright-backup.arcw", enc);
    showSuccess("Exported encrypted backup");
  };

  const handleImportEncryptedFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || "");
      const decrypted = await decryptString(text, password);
      onImportJSON(decrypted);
      showSuccess("Imported encrypted backup");
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full w-full flex-col border-l">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-sm font-semibold">Assistant</span>
      </div>
      <Separator />
      <Tabs defaultValue="assistant" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 w-fit">
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="flex-1 p-3 space-y-3">
          <AIAssistant />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write notes, ideas, or prompts..."
            className="min-h-[120px]"
          />
          <div className="text-xs text-muted-foreground">
            This panel is for notes or future assistant features.
          </div>
        </TabsContent>

        <TabsContent value="voice" className="flex-1 p-3">
          <div className="text-xs text-muted-foreground">
            Voice controls placeholder. Add real recording or transcription later.
          </div>
        </TabsContent>

        <TabsContent value="data" className="flex-1 p-3 space-y-3">
          <div className="text-sm font-medium">Local backups</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPlain}>Export JSON</Button>
            <Button
              variant="secondary"
              onClick={() => plainFileInputRef.current?.click()}
            >
              Import JSON
            </Button>
            <input
              ref={plainFileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => handleImportPlainFile(e.target.files?.[0])}
            />
          </div>

          <Separator />

          <div className="text-sm font-medium">Encrypted backups</div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
              placeholder="Set a password"
              aria-label="Backup password"
            />
            <Button variant="outline" onClick={handleExportEncrypted} disabled={!password}>
              Export Encrypted
            </Button>
            <Button
              variant="secondary"
              onClick={() => encFileInputRef.current?.click()}
              disabled={!password}
            >
              Import Encrypted
            </Button>
            <input
              ref={encFileInputRef}
              type="file"
              accept=".arcw,application/json,text/plain"
              className="hidden"
              onChange={(e) => handleImportEncryptedFile(e.target.files?.[0])}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Backups are stored locally. Encrypted backups use AES-GCM with PBKDF2.
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 p-3 space-y-3">
          <AdvancedSettings />
        </TabsContent>

        <TabsContent value="style" className="flex-1 p-3">
          <StyleTrainer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistantPanel;
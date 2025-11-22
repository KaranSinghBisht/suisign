// frontend/src/dapp/mail/ComposePanel.tsx

import React from "react";
import { draftAgreementWithAI } from "../../ai/draftAgreement";
import { RichTextEditor } from "../../components/RichTextEditor";
import { stripHtml } from "../../utils/text";
import { type ComposeMode } from "./types";
import {
  MAIL_TEMPLATES,
  type TemplateId,
  type TemplateContext,
} from "./templates";

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    subject: string;
    message: string;
    signerInput: string;
    mode: ComposeMode;
    file?: File | null;
    requiresHandSignature: boolean;
  }) => void | Promise<void>;
  /** Optional: label/handle of the connected wallet (e.g. kryptos.sui or 0x4a…89b2) */
  currentUserLabel?: string;
  /** How to render the panel: modal overlay vs inline pane */
  variant?: "modal" | "inline";
}

export const ComposePanel: React.FC<ComposePanelProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentUserLabel,
  variant = "modal",
}) => {
  const [subject, setSubject] = React.useState("");
  const [signerInput, setSignerInput] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [aiInstructions, setAiInstructions] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] =
    React.useState<TemplateId | "">("");
  const [mode, setMode] = React.useState<ComposeMode>("richtext");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [requiresHandSignature, setRequiresHandSignature] =
    React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isDrafting, setIsDrafting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSubject("");
      setSignerInput("");
      setMessage("");
      setPdfFile(null);
      setMode("richtext");
      setIsCreating(false);
      setIsDrafting(false);
      setAiInstructions("");
      setSelectedTemplateId("");
      setError(null);
      setRequiresHandSignature(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setPdfFile(null);
      return;
    }

    if (f.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      e.target.value = "";
      setPdfFile(null);
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (f.size > maxBytes) {
      alert("PDF is too large. Please keep it under 5 MB.");
      e.target.value = "";
      setPdfFile(null);
      return;
    }

    setPdfFile(f);
  };

  const handleDraftWithAI = async () => {
    if (isDrafting || mode !== "richtext") return;

    const trimmedSubject = subject.trim();
    const trimmedSigners = signerInput.trim();
    const trimmedPlainMessage = stripHtml(message).trim();

    if (!trimmedSubject) {
      setError("Add a subject before asking AI to draft.");
      return;
    }
    if (!trimmedSigners) {
      setError("Add at least one signer (handle or address) before using AI.");
      return;
    }

    try {
      setError(null);
      setIsDrafting(true);

      const draft = await draftAgreementWithAI({
        subject: trimmedSubject,
        signerInput: trimmedSigners,
        existingMessage: trimmedPlainMessage ? message : undefined,
        instructions: aiInstructions || undefined,
        initiatorLabel: currentUserLabel,
      });

      setMessage(draft);
    } catch (err: any) {
      console.error("[SuiSign] AI draft failed", err);
      setError(
        err?.message ??
          "Something went wrong while asking AI to draft the message.",
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    const trimmedSubject = subject.trim();
    const trimmedSigners = signerInput.trim();
    const trimmedPlainMessage = stripHtml(message).trim();

    if (!trimmedSubject) {
      alert("Subject is required.");
      return;
    }
    if (!trimmedSigners) {
      alert("At least one signer is required.");
      return;
    }

    if (mode === "richtext" && !trimmedPlainMessage) {
      alert("Message body is required for a secure message.");
      return;
    }

    if (mode === "pdf" && !pdfFile) {
      alert("Please choose a PDF to upload.");
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      await onCreate({
        subject: trimmedSubject,
        signerInput: trimmedSigners,
        mode,
        // store HTML so we keep bold/lists/etc
        message: mode === "richtext" ? message : "",
        file: mode === "pdf" ? pdfFile : null,
        requiresHandSignature,
      });
    } catch (err: any) {
      console.error("[SuiSign] compose failed", err);
      setError(
        err?.message ??
          "Something went wrong while creating the document.",
      );
      return;
    } finally {
      setIsCreating(false);
    }
    onClose();
  };

  function parseSignerList(raw: string): string[] {
    return raw
      .split(/[,;\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function buildTemplateContext(
    signerInput: string,
    initiatorLabel?: string,
  ): TemplateContext {
    const all = parseSignerList(signerInput);
    const lowerInit = initiatorLabel?.toLowerCase() ?? "";
    const otherParties = all.filter((s) => s.toLowerCase() !== lowerInit);
    return {
      initiatorLabel,
      otherParties,
    };
  }

  const handleSelectTemplate = (id: string) => {
    const template = MAIL_TEMPLATES.find((t) => t.id === id);
    setSelectedTemplateId(id as TemplateId);

    if (!template) return;

    const ctx = buildTemplateContext(signerInput, currentUserLabel);

    if (!subject.trim()) {
      const nextSubject = template.buildSubject(ctx);
      setSubject(nextSubject);
    }

    const bodyHtml = template.buildBodyHtml(ctx);
    setMessage(bodyHtml);

    if (!aiInstructions.trim() && template.defaultAiHint) {
      setAiInstructions(template.defaultAiHint);
    }
  };

  const cardClasses =
    variant === "inline"
      ? "w-full h-full bg-slate-950 border-l border-slate-800 flex flex-col"
      : "w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden";

  const panel = (
    <div className={cardClasses}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
        <h2 className="text-sm font-semibold text-slate-100">
          New secure document
        </h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-4 space-y-4 overflow-y-auto"
      >
        {/* Mode toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMode("richtext")}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
              mode === "richtext"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800"
            }`}
          >
            Text agreement
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
              mode === "pdf"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800"
            }`}
          >
            Upload PDF
          </button>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">
            Subject
          </label>
          <input
            type="text"
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Example: Consulting Agreement – Q4 2025"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Signers + templates + AI instructions */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300">
            Signers (handles or addresses)
          </label>
          <input
            type="text"
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="kryptos, 0xabc..., alice.sui"
            value={signerInput}
            onChange={(e) => {
              setSignerInput(e.target.value);
              if (error) setError(null);
            }}
          />
          <p className="text-[11px] text-slate-500">
            Everyone listed here will be able to decrypt this document (via
            Seal).
          </p>

          {mode === "richtext" && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Template (optional)
                </label>
                <select
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                >
                  <option value="">
                    Start from a blank document…
                  </option>
                  {MAIL_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-[11px] text-slate-500">
                    {
                      MAIL_TEMPLATES.find(
                        (t) => t.id === selectedTemplateId,
                      )?.description
                    }
                  </p>
                )}
              </div>

              <div className="mt-3 space-y-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Optional AI instructions
                </label>
                <textarea
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                  placeholder="Tell the AI what this agreement should cover, tone, special clauses, etc."
                  value={aiInstructions}
                  onChange={(e) => {
                    setAiInstructions(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
        </div>

        {/* Mode-specific content */}
        {mode === "richtext" ? (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Message
            </label>
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="Write the contents of the document here, or let AI draft something for you."
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Upload PDF document
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                We’ll encrypt the raw PDF bytes in your browser, store only the
                ciphertext on Walrus, and gate decryption via Seal.
              </p>
              {pdfFile && (
                <p className="text-[11px] text-slate-400">
                  Selected: <span className="font-mono">{pdfFile.name}</span>
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requiresHandSignature}
                onChange={(e) => setRequiresHandSignature(e.target.checked)}
              />
              Require handwritten signature from all parties
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          {mode === "richtext" && (
            <button
              type="button"
              onClick={handleDraftWithAI}
              disabled={isDrafting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/60 text-blue-300 hover:bg-blue-600/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>✨</span>
              <span>{isDrafting ? "Drafting…" : "Draft with AI"}</span>
            </button>
          )}
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30 disabled:opacity-60"
          >
            {isCreating ? "Creating…" : "Create secure doc"}
          </button>
        </div>
      </form>
    </div>
  );

  if (variant === "inline") {
    return panel;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {panel}
    </div>
  );
};

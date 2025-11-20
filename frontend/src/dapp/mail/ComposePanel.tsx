// frontend/src/dapp/mail/ComposePanel.tsx
import React, { useState } from "react";

interface ComposePayload {
  subject: string;
  message: string;
  signerInput: string; // comma-separated addresses/handles for now
}

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: ComposePayload) => Promise<void> | void;
}

export const ComposePanel: React.FC<ComposePanelProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [signerInput, setSignerInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!signerInput.trim()) {
      setError("At least one signer is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate({ subject, message, signerInput });
      setIsSubmitting(false);
      setSubject("");
      setMessage("");
      setSignerInput("");
      onClose();
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      setError(err?.message ?? "Failed to create document");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-background/80">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-100">New Agreement</span>
            <span className="text-[11px] text-slate-500">
              Encrypt in browser, store on Walrus, sign on Sui
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 rounded-full p-1.5 hover:bg-slate-800 transition-colors"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Subject</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/60"
              placeholder="Consulting Agreement – Q4 2024"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              Signers (addresses or SuiSign handles)
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/60"
              placeholder="kryptos, 0xabc..., alice.sui"
              value={signerInput}
              onChange={(e) => setSignerInput(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">Separate multiple signers with commas.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Message to signers</label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/60 min-h-[120px]"
              placeholder="Context, terms, or instructions for the agreement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] transition-all disabled:opacity-60 disabled:hover:scale-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Encrypt & Create On-Chain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

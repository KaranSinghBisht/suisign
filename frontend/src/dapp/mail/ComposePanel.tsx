import React from "react";

type ComposeMode = "message" | "file";

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    subject: string;
    message: string;
    signerInput: string;
    mode: ComposeMode;
    file?: File | null;
  }) => void | Promise<void>;
}

export const ComposePanel: React.FC<ComposePanelProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [subject, setSubject] = React.useState("");
  const [signerInput, setSignerInput] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [mode, setMode] = React.useState<ComposeMode>("message");
  const [file, setFile] = React.useState<File | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSubject("");
      setSignerInput("");
      setMessage("");
      setFile(null);
      setMode("message");
      setIsCreating(false);  
      setError(null);        
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }

    if (f.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      e.target.value = "";
      setFile(null);
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (f.size > maxBytes) {
      alert("PDF is too large. Please keep it under 5 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    const trimmedSubject = subject.trim();
    const trimmedSigners = signerInput.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      alert("Subject is required.");
      return;
    }
    if (!trimmedSigners) {
      alert("At least one signer is required.");
      return;
    }

    if (mode === "message" && !trimmedMessage) {
      alert("Message body is required for a secure message.");
      return;
    }

    if (mode === "file" && !file) {
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
        message: mode === "message" ? trimmedMessage : "",
        file: mode === "file" ? file : null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
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
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode("message")}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                mode === "message"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800"
              }`}
            >
              Secure message
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                mode === "file"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800"
              }`}
            >
              Upload document (PDF)
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

          {/* Signers */}
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
            {error && (
              <p className="text-xs text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Mode-specific content */}
          {mode === "message" ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Message
              </label>
              <textarea
                className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[140px]"
                placeholder="Write the contents of the document here. This will be encrypted before leaving your browser."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          ) : (
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
              {file && (
                <p className="text-[11px] text-slate-400">
                  Selected: <span className="font-mono">{file.name}</span>
                </p>
              )}
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
    </div>
  );
};

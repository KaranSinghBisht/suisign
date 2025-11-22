// frontend/src/dapp/mail/ReadingPane.tsx
import React from "react";
import { UiDocument } from "./types";
import { Badge } from "./Badge";
import {
  Download,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  PenTool,
} from "lucide-react";
import { readSealSecretForDoc, SEAL_ENOACCESS } from "../../sealClient";
import { fetchEncryptedBlob } from "../../storage";
import { decryptMessageFromWalrus, fromBase64 } from "../../cryptoHelpers";
import { stripHtml } from "../../utils/text";

const DEFAULT_EXPLORER_BASE = "https://testnet.suivision.xyz";

interface ReadingPaneProps {
  doc: UiDocument | null;
  onSign?: (docId: string) => Promise<void> | void;
  currentAddress?: string | null;
  signPersonalMessage?: (input: {
    message: Uint8Array;
  }) => Promise<{ signature: string }>;
}

export const ReadingPane: React.FC<ReadingPaneProps> = ({
  doc,
  onSign,
  currentAddress,
  signPersonalMessage,
}) => {
  const hasOnChainObject = !!doc?.id && doc.id.startsWith("0x");
  const [decryptedBody, setDecryptedBody] = React.useState<string | null>(null);
  const [decryptError, setDecryptError] = React.useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [decryptedFileUrl, setDecryptedFileUrl] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    setDecryptedBody(null);
    setDecryptError(null);
    setIsDecrypting(false);
    if (decryptedFileUrl) {
      URL.revokeObjectURL(decryptedFileUrl);
    }
    setDecryptedFileUrl(null);
  }, [doc?.id]);

  React.useEffect(() => {
    return () => {
      if (decryptedFileUrl) {
        URL.revokeObjectURL(decryptedFileUrl);
      }
    };
  }, [decryptedFileUrl]);

  const meLower = (currentAddress ?? "").toLowerCase();
  const signerAddrs = doc?.signerAddresses ?? [];
  const isSigner =
    !!meLower &&
    signerAddrs.some((addr) => addr && addr.toLowerCase() === meLower);

  const isOnChain = !!doc?.id && doc.id.startsWith("0x");
  const canSign =
    !!doc && doc.status === "pending" && isSigner && isOnChain;

  const signDisabledReason = !doc
    ? ""
    : !isOnChain
    ? "This document hasn’t been created on-chain yet."
    : !isSigner
    ? "You’re not a signer on this document."
    : "";

  const isFileDoc =
    !!doc &&
    (doc.contentKind === "file" || (!!doc.mimeType && doc.mimeType.length > 0));

  async function decryptFileBytes(options: {
    cipherB64: string;
    keyB64: string;
    ivB64: string;
  }): Promise<Uint8Array> {
    const keyBytes = new Uint8Array(fromBase64(options.keyB64));
    const ivBytes = new Uint8Array(fromBase64(options.ivB64));
    const cipherBytes = new Uint8Array(fromBase64(options.cipherB64));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      false,
      ["decrypt"],
    );

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      cryptoKey,
      cipherBytes,
    );

    return new Uint8Array(plainBuf);
  }

  async function handleDecrypt() {
    if (!doc || !doc.walrusBlobId || !doc.sealSecretId) {
      setDecryptError("This document has no encrypted content");
      return;
    }

    if (!signPersonalMessage) {
      setDecryptError("Wallet does not support personal message signing");
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      const { keyB64, ivB64 } = await readSealSecretForDoc(
        doc.id,
        doc.sealSecretId,
        {
          signPersonalMessage: async (msg: Uint8Array) => {
            const { signature } = await signPersonalMessage({ message: msg });
            return signature;
          },
        },
      );

      const blob = await fetchEncryptedBlob(doc.walrusBlobId);
      if (!blob) {
        throw new Error("Encrypted Walrus blob not found");
      }

      if (isFileDoc && doc.mimeType) {
        const bytes = await decryptFileBytes({
          cipherB64: blob.cipherB64,
          keyB64,
          ivB64,
        });

        const normalizedBytes = new Uint8Array(bytes);

        const fileBlob = new Blob([normalizedBytes], {
          type: doc.mimeType || "application/octet-stream",
        });
        const url = URL.createObjectURL(fileBlob);
        setDecryptedFileUrl(url);
        setDecryptedBody(null);
      } else {
        const plaintext = await decryptMessageFromWalrus({
          cipherB64: blob.cipherB64,
          ivB64,
          keyB64,
        });

        try {
          const parsed = JSON.parse(plaintext);
          const body =
            typeof parsed.message === "string" ? parsed.message : plaintext;
          setDecryptedBody(body);
        } catch {
          setDecryptedBody(plaintext);
        }
      }
    } catch (err: any) {
      console.error("[SuiSign] decrypt failed", err);
      if (err?.code === SEAL_ENOACCESS) {
        setDecryptError("You’re not authorized to decrypt this document.");
      } else {
        setDecryptError(err?.message ?? String(err));
      }
    } finally {
      setIsDecrypting(false);
    }
  }

  function handleOpenExplorer() {
    if (!doc) return;
    if (!hasOnChainObject) {
      alert("This document only exists locally and has no on-chain object yet.");
      return;
    }
    const explorerUrl = `${DEFAULT_EXPLORER_BASE}/object/${doc.id}`;
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  }

  function renderHtmlOrFallback(html: string) {
    const text = stripHtml(html);
    if (!text) return null;

    return (
      <div
        className="prose prose-slate prose-sm max-w-none"
        // TipTap output is controlled by the app, so this is acceptable for now.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  function renderMessageContent() {
    if (!doc) return null;

    if (isFileDoc) {
      if (decryptedFileUrl) {
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Decrypted PDF preview — you can also download the original using the button below.
            </p>
            <iframe
              src={decryptedFileUrl}
              className="w-full h-[550px] border border-slate-200 rounded-md"
            />
          </div>
        );
      }

      if (doc.walrusBlobId && doc.sealSecretId) {
        return "🔐 This is an encrypted document. Click “Decrypt document” above to view and download the original file.";
      }

      return "Content not available for this document.";
    }

    const htmlToRender =
      decryptedBody ??
      (doc.walrusBlobId && doc.sealSecretId ? "" : doc.message || "");

    if (htmlToRender) {
      return renderHtmlOrFallback(htmlToRender);
    }

    if (doc.walrusBlobId && doc.sealSecretId) {
      return "🔐 This message is encrypted. Click “Decrypt message” above to view the contents.";
    }

    return "Content not available for this document.";
  }

  if (!doc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 select-none bg-background">
        <div className="w-20 h-20 rounded-2xl bg-slate-900/50 flex items-center justify-center mb-6 border border-slate-800 shadow-inner transform rotate-3">
          <ShieldCheck size={40} className="opacity-20 text-blue-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-400 mb-2">
          No document selected
        </h3>
        <p className="text-sm max-w-xs text-center opacity-60">
          Select a document from the list to view details, sign, or manage its
          status on Walrus.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header / Toolbar */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4 bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Badge status={doc.status} />
            <span className="text-xs text-slate-500 font-mono">
              ID: {doc.id.substring(0, 8)}...
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white truncate leading-tight mb-1">
            {doc.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-medium text-blue-400">{doc.fromLabel}</span>
            <span>to</span>
            <span className="text-slate-300">{doc.toLabels.join(", ")}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
          {/* Metadata Card */}
          <div className="bg-surface border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-300">
                    {doc.fromLabel.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Walrus Storage ID
                  </p>
                  <p className="text-xs font-mono text-slate-500">
                    {doc.walrusBlobId || "blob_placeholder_id"}
                  </p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-medium text-slate-300">Created</p>
                <p className="text-xs text-slate-500">{doc.createdAt}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {isFileDoc
                  ? decryptedFileUrl
                    ? doc.fileName
                      ? `🔓 Decrypted document: ${doc.fileName}`
                      : "🔓 Decrypted document ready to view."
                    : doc.fileName
                      ? `🔐 Encrypted document: ${doc.fileName}`
                      : "🔐 Encrypted document. Decrypt to download the original file."
                  : decryptedBody
                    ? stripHtml(decryptedBody).slice(0, 160)
                    : doc.walrusBlobId && doc.sealSecretId
                      ? "🔐 Encrypted message body. Decrypt to view."
                      : doc.messagePreview}
              </p>
              {doc.walrusBlobId && doc.sealSecretId && (
                <button
                  onClick={handleDecrypt}
                  disabled={isDecrypting}
                  className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {isDecrypting
                    ? "Decrypting…"
                    : isFileDoc
                      ? "Decrypt document"
                      : "Decrypt message"}
                </button>
              )}
            </div>
          </div>

          {/* Document Preview Body */}
          <div className="bg-white text-slate-900 rounded-sm shadow-2xl min-h-[400px] p-8 md:p-12 relative mx-auto max-w-3xl">
            <div className="absolute inset-0 bg-stone-50 opacity-50 pointer-events-none mix-blend-multiply" />
            <div className="relative z-10 font-serif">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
                {doc.subject}
              </h2>
              <div className="whitespace-pre-wrap text-sm md:text-base leading-loose text-slate-800">
                {isDecrypting && (
                  <span className="text-slate-400 text-xs">Decrypting…</span>
                )}

                {decryptError && (
                  <span className="text-red-500 text-xs">
                    Failed to decrypt: {decryptError}
                  </span>
                )}

                {!isDecrypting && !decryptError && renderMessageContent()}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between items-end">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-4">
                    Signed By
                  </p>
                  <div className="mt-2 text-sm text-sky-500 flex flex-wrap gap-2">
                    {!doc.signedByLabels || doc.signedByLabels.length === 0 ? (
                      <span className="text-slate-500 italic">
                        Pending Signature
                      </span>
                    ) : (
                      doc.signedByLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-block max-w-[180px] truncate align-bottom"
                          title={label}
                        >
                          {label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">SuiSign Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 md:px-8 border-t border-slate-800 bg-surface/90 backdrop-blur-xl z-30 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {doc.contentKind === "file" && (
              <button
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (!decryptedFileUrl) {
                    alert(
                      "Decrypt the document first, then you can download the original PDF.",
                    );
                    return;
                  }
                  const a = document.createElement("a");
                  a.href = decryptedFileUrl;
                  a.download = doc.fileName || "document.pdf";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                disabled={!decryptedFileUrl}
              >
                <Download size={16} />
                <span>Download original</span>
              </button>
            )}
            <button
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleOpenExplorer}
              disabled={!hasOnChainObject}
              title={
                hasOnChainObject
                  ? "View this document on Sui Explorer"
                  : "This document has not been created on-chain yet"
              }
            >
              <ExternalLink size={16} />
              <span>Explorer</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {doc.status === "pending" && (
              <button
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all
        ${
          canSign
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
            : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
        }`}
                disabled={!canSign}
                title={signDisabledReason || undefined}
                onClick={() => {
                  if (!canSign) return;
                  onSign?.(doc.id);
                }}
              >
                <PenTool size={18} />
                <span>Sign Document</span>
              </button>
            )}
            {(doc.status === "signed" || doc.status === "completed") && (
              <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 cursor-default">
                <FileCheck size={18} />
                <span>Signed & Verified</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

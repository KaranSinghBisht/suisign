// frontend/src/dapp/mail/MailDashboard.tsx

import React, { useState, useEffect } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Sidebar } from "./Sidebar";
import { DocumentList } from "./DocumentList";
import { ReadingPane } from "./ReadingPane";
import { UiDocument, FolderType } from "./types";
import {
  loadDocsForAddress,
  saveDocForAddress,
  type StoredDocMetadata,
  updateDocStatusForAddress,
  updateDocSignedAddressesForAddress,
  type StoredDocStatus,
} from "../../storage";
import { getHandleForAddress } from "../../handleRegistry";
import { stripHtml } from "../../utils/text";
import { ComposePanel } from "./ComposePanel";
import { createDocumentFromCompose } from "./createFromCompose";
import { signDocumentOnChain } from "./signDocument";
import { fetchDocumentFromChain } from "../../chain/documentQueries";

interface MailDashboardProps {
  currentAddress?: string | null;
  signPersonalMessage?: (input: {
    message: Uint8Array;
  }) => Promise<{ signature: string }>;
}

/* ---------- helpers ---------- */

function formatAddressLabel(addr: string): string {
  if (!addr) return "";
  const handle = getHandleForAddress(addr);
  if (handle && handle.length > 0) {
    return `${handle}.sui`;
  }
  if (addr.startsWith("0x") && addr.length > 10) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  return addr;
}

function buildSignedByLabels(addrs: string[] | undefined | null): string[] {
  if (!addrs || !addrs.length) return [];
  const labels: string[] = [];
  for (const raw of addrs) {
    if (!raw) continue;
    const label = formatAddressLabel(raw);
    if (label && label.trim().length > 0) {
      labels.push(label);
    }
  }
  return Array.from(new Set(labels));
}

function deriveEffectiveSignedAddresses(
  status: StoredDocStatus | undefined,
  storedSigned: string[] | undefined,
  signers: string[] | undefined,
): string[] {
  const signed = (storedSigned ?? []).map((a) => a.toLowerCase());
  const signerList = (signers ?? []).map((a) => a.toLowerCase());

  if (status === "completed" && signerList.length > 0) {
    if (signed.length === 0 || signed.length < signerList.length) {
      return Array.from(new Set(signerList));
    }
  }

  return signed;
}

/* ---------- mapping from storage to UI ---------- */

function mapStoredToUi(
  stored: StoredDocMetadata[],
  currentAddress?: string | null,
): UiDocument[] {
  const currentLower = currentAddress ? currentAddress.toLowerCase() : "";
  const meLabel = currentLower ? formatAddressLabel(currentLower) : "me.sui";

  return stored.map((doc) => {
    const senderAddrLower =
      doc.senderAddress && doc.senderAddress.length
        ? doc.senderAddress.toLowerCase()
        : "";

    const fromLabel = senderAddrLower
      ? formatAddressLabel(senderAddrLower)
      : meLabel;

    const signerAddresses = (doc.signers ?? []).map((a) => a.toLowerCase());
    const status: StoredDocStatus = doc.status ?? "pending";

    const effectiveSigned = deriveEffectiveSignedAddresses(
      status,
      doc.signedAddresses,
      signerAddresses,
    );

    const toLabels =
      signerAddresses && signerAddresses.length
        ? signerAddresses.map((addr) => formatAddressLabel(addr))
        : ["todo"];

    const tags: string[] = [];
    if (!doc.objectId || !doc.objectId.startsWith("0x")) {
      tags.push("Local");
    } else {
      tags.push("On-chain");
      if (status === "completed") {
        tags.push("Signed");
      }
    }

    const signedByLabels = buildSignedByLabels(effectiveSigned);

    const rawPreview =
      typeof doc.messagePreview === "string" && doc.messagePreview.length > 0
        ? doc.messagePreview
        : doc.message || "";

    const safePreview = stripHtml(rawPreview);

    const contentKind =
      doc.contentKind ?? (doc.mimeType ? "file" : "message");

    return {
      id: doc.objectId || doc.blobId,
      subject: doc.subject || "Untitled document",
      fromLabel,
      toLabels,
      createdAt: doc.createdAt || "Just now",
      timestamp: doc.createdAt ? Date.parse(doc.createdAt) : Date.now(),
      status,
      isUnread: true,
      messagePreview: safePreview,
      message: doc.message || "",
      walrusBlobId: doc.blobId,
      walrusHashHex: doc.hashHex,
      sealSecretId: doc.sealSecretId || undefined,
      tags,
      signedByLabels,
      signedAddresses: effectiveSigned,
      signerAddresses,
      senderAddress: senderAddrLower || undefined,

      contentKind,
      fileName: doc.fileName ?? undefined,
      mimeType: doc.mimeType ?? undefined,
    };
  });
}

/* ---------- component ---------- */

export const MailDashboard: React.FC<MailDashboardProps> = ({
  currentAddress,
  signPersonalMessage,
}) => {
  const [documents, setDocuments] = useState<UiDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderType>(
    FolderType.INBOX,
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  /* ----- initial load for current wallet ----- */

  useEffect(() => {
    if (!currentAddress) {
      setDocuments([]);
      setSelectedDocId(null);
      return;
    }

    const stored = loadDocsForAddress(currentAddress.toLowerCase());
    if (!stored.length) {
      setDocuments([]);
      setSelectedDocId(null);
      return;
    }

    const uiDocs = mapStoredToUi(stored, currentAddress);
    setDocuments(uiDocs);
    setSelectedDocId(uiDocs[0]?.id ?? null);
  }, [currentAddress]);

  /* ----- sync from chain for this wallet's docs ----- */

  useEffect(() => {
    if (!currentAddress) return;
    const addrLower = currentAddress.toLowerCase();
    let isMounted = true;

    async function syncFromChainOnce() {
      const stored = loadDocsForAddress(addrLower);
      const candidates = stored
        .filter((d) => d.objectId && d.objectId.startsWith("0x"))
        .slice(0, 20);

      const updates: {
        objectId: string;
        status: StoredDocStatus;
        signedAddresses: string[];
        signerAddresses: string[];
        walrusBlobId?: string;
        walrusHashHex?: string;
        sealSecretId?: string;
      }[] = [];

      for (const doc of candidates) {
        const onChain = await fetchDocumentFromChain(doc.objectId);
        if (!onChain) continue;

        const signerAddrs = (doc.signers ?? []).map((s) =>
          String(s || "").toLowerCase(),
        );

        const chainSigAddrs = (onChain.signatures ?? [])
          .map((s) => String(s.signer || "").toLowerCase())
          .filter((s) => s.startsWith("0x"));

        const totalSigners = onChain.signers?.length ?? signerAddrs.length;
        const sigCount = chainSigAddrs.length;

        let status: StoredDocStatus = "pending";
        if (
          onChain.fullySigned ||
          (totalSigners > 0 && sigCount >= totalSigners)
        ) {
          status = "completed";
        } else if (sigCount > 0) {
          status = "signed";
        }

        let mergedSigned = Array.from(
          new Set<string>([
            ...(doc.signedAddresses ?? []).map((a) => a.toLowerCase()),
            ...chainSigAddrs,
          ]),
        );

        mergedSigned = deriveEffectiveSignedAddresses(
          status,
          mergedSigned,
          signerAddrs,
        );

        updates.push({
          objectId: doc.objectId,
          status,
          signedAddresses: mergedSigned,
          signerAddresses: signerAddrs,
          walrusBlobId: onChain.walrusBlobId ?? doc.blobId,
          walrusHashHex: onChain.walrusHashHex ?? doc.hashHex,
          sealSecretId: onChain.sealSecretId ?? doc.sealSecretId ?? "",
        });

        updateDocStatusForAddress(addrLower, doc.objectId, status);
        updateDocSignedAddressesForAddress(addrLower, doc.objectId, mergedSigned);
      }

      if (!updates.length) return;

      if (!isMounted) return;
      const storedAfter = loadDocsForAddress(addrLower);
      const uiDocs = mapStoredToUi(storedAfter, currentAddress);
      setDocuments(uiDocs);
    }

    void syncFromChainOnce();

    const id = window.setInterval(() => {
      if (!isMounted) return;
      void syncFromChainOnce();
    }, 20000);

    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, [currentAddress]);

  /* ----- derived + handlers ----- */

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  const filteredDocs = React.useMemo(() => {
    if (!currentAddress) return documents;
    const me = currentAddress.toLowerCase();

    switch (currentFolder) {
      case FolderType.INBOX:
        return documents.filter((doc) =>
          (doc.signerAddresses ?? []).some(
            (addr) => addr && addr.toLowerCase() === me,
          ),
        );
      case FolderType.SENT:
        return documents.filter(
          (doc) =>
            doc.senderAddress && doc.senderAddress.toLowerCase() === me,
        );
      default:
        return documents;
    }
  }, [documents, currentAddress, currentFolder]);

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isUnread: false } : d)),
    );
  };

  const handleFolderChange = (folder: FolderType) => {
    const allowed = [FolderType.INBOX, FolderType.SENT];
    setCurrentFolder(
      allowed.includes(folder) ? folder : FolderType.INBOX,
    );
    setSelectedDocId(null);
    setIsMobileMenuOpen(false);
  };

  const handleCompose = () => {
    setIsComposeOpen(true);
  };

  const handleCreateFromCompose = async (payload: {
    subject: string;
    message: string;
    signerInput: string;
    mode: "message" | "file";
    file?: File | null;
  }) => {
    if (!currentAddress) {
      throw new Error("Connect your wallet before creating a document.");
    }

    const senderLower = currentAddress.toLowerCase();

    const storedDoc = await createDocumentFromCompose({
      subject: payload.subject,
      message: payload.message,
      signerInput: payload.signerInput,
      senderAddress: senderLower,
      signAndExecute: (args) => signAndExecuteTransaction(args),
      file: payload.mode === "file" ? payload.file ?? null : null,
    });

    saveDocForAddress(senderLower, storedDoc);

    if (storedDoc.signers && storedDoc.signers.length > 0) {
      for (const signer of storedDoc.signers) {
        if (!signer) continue;
        const addr = signer.toLowerCase();
        if (addr === senderLower) continue;

        saveDocForAddress(addr, {
          ...storedDoc,
          status: "pending",
        });
      }
    }

    const updatedStored = loadDocsForAddress(senderLower);
    const uiDocs = mapStoredToUi(updatedStored, senderLower);
    setDocuments(uiDocs);
    setSelectedDocId(storedDoc.objectId || storedDoc.blobId);
  };

  const handleSign = async (docId: string) => {
    if (!currentAddress) {
      throw new Error("Connect your wallet to sign.");
    }

    const meLower = currentAddress.toLowerCase();
    const target = documents.find((d) => d.id === docId) || null;
    const signerAddrs = target?.signerAddresses ?? [];
    const prevSigned = target?.signedAddresses ?? [];

    if (!target) {
      console.warn("[SuiSign] handleSign called with unknown docId:", docId);
      return;
    }

    if (
      signerAddrs.length &&
      !signerAddrs.some((addr) => addr && addr.toLowerCase() === meLower)
    ) {
      console.warn(
        "[SuiSign] current user is not a signer; ignoring sign click",
      );
      return;
    }

    if (!target.id || !target.id.startsWith("0x")) {
      console.warn(
        "[SuiSign] document has no on-chain object; cannot sign",
        target.id,
      );
      return;
    }

    try {
      let optimisticMerged = Array.from(
        new Set<string>([meLower, ...prevSigned.map((a) => a.toLowerCase())]),
      );

      optimisticMerged = deriveEffectiveSignedAddresses(
        "signed",
        optimisticMerged,
        signerAddrs,
      );

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: "signed",
                isUnread: false,
                signedAddresses: optimisticMerged,
                signedByLabels: buildSignedByLabels(optimisticMerged),
              }
            : doc,
        ),
      );

      const result = await signDocumentOnChain(
        docId,
        ({ transaction }) => signAndExecuteTransaction({ transaction }),
      );

      console.log("[SuiSign] sign_document tx result", result);

      const onChain = await fetchDocumentFromChain(docId);

      let mergedSignedAddresses = optimisticMerged;
      let finalStatus: StoredDocStatus = "signed";

      if (onChain) {
        const chainSigAddrs = (onChain.signatures ?? [])
          .map((s) => String(s.signer || "").toLowerCase())
          .filter((s) => s.startsWith("0x"));

        mergedSignedAddresses = Array.from(
          new Set<string>([...mergedSignedAddresses, ...chainSigAddrs]),
        );

        const totalSigners = onChain.signers?.length ?? signerAddrs.length;
        const sigCount = mergedSignedAddresses.length;

        if (
          onChain.fullySigned ||
          (totalSigners > 0 && sigCount >= totalSigners)
        ) {
          finalStatus = "completed";
        } else if (sigCount === 0) {
          finalStatus = "pending";
        }
      } else if (mergedSignedAddresses.length === 0) {
        finalStatus = "pending";
      }

      mergedSignedAddresses = deriveEffectiveSignedAddresses(
        finalStatus,
        mergedSignedAddresses,
        signerAddrs,
      );

      const finalSignedByLabels = buildSignedByLabels(mergedSignedAddresses);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: finalStatus,
                isUnread: false,
                signedAddresses: mergedSignedAddresses,
                signedByLabels: finalSignedByLabels,
              }
            : doc,
        ),
      );

      updateDocStatusForAddress(meLower, docId, finalStatus);
      updateDocSignedAddressesForAddress(
        meLower,
        docId,
        mergedSignedAddresses,
      );
    } catch (err: any) {
      console.error("[SuiSign] sign failed", err);
      alert(`Sign failed: ${err?.message ?? String(err)}`);

      const storedAfterError = loadDocsForAddress(currentAddress.toLowerCase());
      const uiDocs = mapStoredToUi(storedAfterError, currentAddress);
      setDocuments(uiDocs);
    }
  };

  /* ---------- render ---------- */

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] w-full bg-background overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            absolute z-40 inset-y-0 left-0 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 w-64
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <Sidebar
            currentFolder={currentFolder}
            onFolderSelect={handleFolderChange}
            onCompose={handleCompose}
            currentAddress={currentAddress ?? null}
          />
        </div>

        {/* Overlay for mobile sidebar */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col md:flex-row h-full min-w-0">
          {/* Document List Column */}
          <div
            className={`
              flex flex-col w-full md:w-96
              ${selectedDocId ? "hidden md:flex" : "flex"}
            `}
          >
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 md:hidden bg-background/80">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-slate-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <h1 className="font-display font-bold text-lg text-white">
                {currentFolder}
              </h1>
            </div>

            <DocumentList
              documents={filteredDocs}
              selectedId={selectedDocId}
              onSelect={handleSelectDoc}
              currentFolder={currentFolder}
            />
          </div>

          {/* Right column: reading vs composing */}
          <div
            className={`
              flex-1 relative
              ${!selectedDocId && !isComposeOpen ? "hidden md:flex" : "flex"}
            `}
          >
            {isComposeOpen ? (
              <ComposePanel
                isOpen={true}
                onClose={() => setIsComposeOpen(false)}
                onCreate={handleCreateFromCompose}
                currentUserLabel={
                  currentAddress ? formatAddressLabel(currentAddress) : undefined
                }
                variant="inline"
              />
            ) : (
              <>
                {selectedDocId && (
                  <button
                    onClick={() => setSelectedDocId(null)}
                    className="md:hidden absolute top-4 left-4 z-20 p-2 bg-slate-800 rounded-full text-white shadow-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}

                <ReadingPane
                  doc={selectedDoc}
                  onSign={handleSign}
                  currentAddress={currentAddress ?? null}
                  signPersonalMessage={
                    signPersonalMessage
                      ? async ({ message }) => signPersonalMessage({ message })
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

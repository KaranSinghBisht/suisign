// /frontend/src/dapp/mail/MailDashboard.tsx
import React, { useState, useEffect } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Sidebar } from "./Sidebar";
import { DocumentList } from "./DocumentList";
import { ReadingPane } from "./ReadingPane";
import { UiDocument, FolderType } from "./types";
import { MOCK_DOCUMENTS } from "./constants";
import {
  loadDocsForAddress,
  saveDocForAddress,
  type StoredDocMetadata,
} from "../../storage";
import { getHandleForAddress } from "../../handleRegistry";
import { ComposePanel } from "./ComposePanel";
import { createDocumentFromCompose } from "./createFromCompose";
import { signDocumentOnChain } from "./signDocument";

interface MailDashboardProps {
  currentAddress?: string | null;
}

function mapStoredToUi(
  stored: StoredDocMetadata[],
  currentAddress?: string | null
): UiDocument[] {
  const meLabel =
    getHandleForAddress(currentAddress) ||
    currentAddress ||
    "me.sui";

  return stored.map((doc) => ({
    id: doc.objectId || doc.blobId,
    subject: doc.subject || "Untitled document",
    fromLabel: meLabel,
    toLabels: ["todo"],
    createdAt: doc.createdAt || "Just now",
    timestamp: doc.createdAt ? Date.parse(doc.createdAt) : Date.now(),
    status: "pending",
    isUnread: true,
    messagePreview: doc.message || "",
    contentBody: doc.message || "",
    walrusBlobId: doc.blobId,
    tags: ["Local"],
  }));
}

export const MailDashboard: React.FC<MailDashboardProps> = ({
  currentAddress,
}) => {
  const [documents, setDocuments] = useState<UiDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderType>(
    FolderType.INBOX
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  useEffect(() => {
    if (!currentAddress) {
      setDocuments(MOCK_DOCUMENTS);
      setSelectedDocId(MOCK_DOCUMENTS[0]?.id ?? null);
      return;
    }

    const stored = loadDocsForAddress(currentAddress);
    if (!stored.length) {
      setDocuments(MOCK_DOCUMENTS);
      setSelectedDocId(MOCK_DOCUMENTS[0]?.id ?? null);
      return;
    }

    const uiDocs = mapStoredToUi(stored, currentAddress);
    setDocuments(uiDocs);
    setSelectedDocId(uiDocs[0]?.id ?? null);
  }, [currentAddress]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;
  const filteredDocs = documents; // later: filter by folder

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isUnread: false } : d))
    );
  };

  const handleFolderChange = (folder: FolderType) => {
    setCurrentFolder(folder);
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
  }) => {
    if (!currentAddress) {
      throw new Error("Connect your wallet before creating a document.");
    }

    const storedDoc = await createDocumentFromCompose({
      subject: payload.subject,
      message: payload.message,
      signerInput: payload.signerInput,
      senderAddress: currentAddress,
      signAndExecute: (args) => signAndExecuteTransaction(args),
    });

    saveDocForAddress(currentAddress, storedDoc);
    const updatedStored = loadDocsForAddress(currentAddress);
    const uiDocs = mapStoredToUi(updatedStored, currentAddress);
    setDocuments(uiDocs);
    setSelectedDocId(storedDoc.objectId || storedDoc.blobId);
  };
  const handleSign = async (docId: string) => {
    if (!currentAddress) {
      throw new Error("Connect your wallet to sign.");
    }

    try {
      const result = await signDocumentOnChain(
        docId,
        ({ transaction }) => signAndExecuteTransaction({ transaction }),
      );

      console.log("[SuiSign] Updated docs after sign", result);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? { ...doc, status: "completed", isUnread: false }
            : doc
        )
      );
    } catch (err: any) {
      console.error("[SuiSign] sign failed", err);
      alert(`Sign failed: ${err?.message ?? String(err)}`);
    }
  };

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
              {/* simple menu icon */}
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

        {/* Reading Pane Column */}
        <div
          className={`
          flex-1 relative
          ${!selectedDocId ? "hidden md:flex" : "flex"}
        `}
        >
          {selectedDocId && (
            <button
              onClick={() => setSelectedDocId(null)}
              className="md:hidden absolute top-4 left-4 z-20 p-2 bg-slate-800 rounded-full text-white shadow-lg"
            >
              {/* back arrow */}
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

          <ReadingPane doc={selectedDoc} onSign={handleSign} />
        </div>
      </div>
    </div>
      <ComposePanel
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onCreate={handleCreateFromCompose}
      />
    </>
  );
};

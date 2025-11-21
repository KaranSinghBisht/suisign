// /frontend/src/dapp/mail/DocumentList.tsx
import React, { useState } from "react";
import { UiDocument, FolderType } from "./types";
import { Search, Filter, RefreshCw } from "lucide-react";
import { Badge } from "./Badge";

interface DocumentListProps {
  documents: UiDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentFolder: FolderType;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedId,
  onSelect,
  currentFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const unreadCount = documents.filter((d) => d.isUnread).length;

  const displayDocs = documents.filter(
    (doc) =>
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fromLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!documents.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-500 px-4 text-center">
        {currentFolder === FolderType.INBOX
          ? "No documents yet. Connect your wallet and have someone send you a document."
          : "No documents in this folder yet."}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface/50 backdrop-blur-sm border-r border-slate-800">
      {/* Search & Toolbar */}
      <div className="px-4 py-3 border-b border-slate-800 space-y-3 bg-background/60 backdrop-blur-xl z-10 sticky top-0">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            {currentFolder}
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 h-5 rounded-full bg-blue-500/10 text-[11px] font-mono text-blue-400 border border-blue-500/30">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search docs..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-400">{currentFolder}</span>
          <div className="flex items-center gap-2">
            <button className="hover:text-slate-300 transition-colors">
              <Filter size={14} />
            </button>
            <button className="hover:text-slate-300 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {displayDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
              <Search size={20} className="opacity-50" />
            </div>
            <span className="text-sm">No documents found</span>
          </div>
        ) : (
          displayDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={`
                group relative flex flex-col gap-1 p-3 rounded-xl cursor-pointer border transition-all duration-200
                ${
                  selectedId === doc.id
                    ? "bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-800"
                }
              `}
            >
              {doc.isUnread && (
                <div className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}

              <div className="flex items-center justify-between mb-0.5 pl-2">
                <span
                  className={`text-sm truncate font-medium ${
                    doc.isUnread ? "text-white" : "text-slate-400"
                  }`}
                >
                  {doc.fromLabel}
                </span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">
                  {doc.createdAt}
                </span>
              </div>

              <div className="pl-2 pr-1">
                <h3
                  className={`text-sm leading-tight mb-1 truncate ${
                    doc.isUnread
                      ? "text-slate-200 font-semibold"
                      : "text-slate-300"
                  }`}
                >
                  {doc.subject}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {doc.messagePreview || ""}
                </p>
              </div>

              <div className="pl-2 mt-2 flex items-center gap-2">
                <Badge status={doc.status} size="sm" />
                {doc.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

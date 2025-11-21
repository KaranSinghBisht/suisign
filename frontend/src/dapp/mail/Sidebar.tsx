import React from "react";
import { FolderType } from "./types";
import { Inbox, Send, PenTool } from "lucide-react";
import { getHandleForAddress } from "../../handleRegistry";

interface SidebarProps {
  currentFolder: FolderType;
  onFolderSelect: (folder: FolderType) => void;
  onCompose: () => void;
  currentAddress?: string | null;
}

function prettyAddress(addr?: string | null): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  onFolderSelect,
  onCompose,
  currentAddress,
}) => {
  const navItems = [
    { type: FolderType.INBOX, icon: Inbox, label: "Inbox", count: 2 },
    { type: FolderType.SENT, icon: Send, label: "Sent", count: 0 },
  ];

  return (
    <div className="flex flex-col h-full p-4 bg-background border-r border-slate-800">
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-2 mb-8 pt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold font-display text-xl shadow-lg shadow-blue-500/20">
          S
        </div>
        <span className="text-xl font-bold font-display tracking-tight text-white">
          SuiSign
        </span>
      </div>

      {/* Compose Button */}
      <button
        onClick={onCompose}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all duration-200 mb-8 border border-slate-700 hover:border-slate-600 shadow-sm group"
      >
        <PenTool
          size={18}
          className="text-blue-400 group-hover:text-blue-300"
        />
        <span className="font-medium">Send new doc</span>
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentFolder === item.type;
          const Icon = item.icon;

          return (
            <button
              key={item.type}
              onClick={() => onFolderSelect(item.type)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-blue-400"
                      : "text-slate-500 group-hover:text-slate-400"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    isActive ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {item.count > 0 && (
                <span
                  className={`
                  text-xs font-bold px-2 py-0.5 rounded-full
                  ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }
                `}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom/Footer Area - User Profile */}
      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-900 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-300 border border-slate-600">
            {(() => {
              if (!currentAddress) return "?";
              const handle = getHandleForAddress(currentAddress);
              if (handle && handle.length > 0) {
                return handle.charAt(0).toUpperCase();
              }
              return currentAddress.slice(2, 4);
            })()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-slate-200 truncate">
              {(() => {
                if (!currentAddress) return "Not connected";
                const handle = getHandleForAddress(currentAddress);
                return handle ? `${handle}.sui` : prettyAddress(currentAddress);
              })()}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {currentAddress ? prettyAddress(currentAddress) : "Connect wallet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

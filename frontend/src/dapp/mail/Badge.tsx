// frontend/src/dapp/mail/Badge.tsx
import React from "react";
import { DocStatus } from "./types";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface BadgeProps {
  status: DocStatus;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({ status, size = "md" }) => {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    signed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const icons = {
    pending: Clock,
    signed: CheckCircle2,
    completed: CheckCircle2,
    rejected: XCircle,
  };

  const labels: Record<string, string> = {
    pending: "Pending Signature",
    signed: "Signed",
    completed: "Completed",
    rejected: "Rejected",
  };

  const Icon = icons[status] || AlertCircle;
  const sizeClass =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? 10 : 14;

  return (
    <span
      className={`
      inline-flex items-center rounded-full border font-medium whitespace-nowrap
      ${styles[status] || "bg-slate-800 text-slate-400"}
      ${sizeClass}
    `}
    >
      <Icon size={iconSize} />
      {labels[status]}
    </span>
  );
};

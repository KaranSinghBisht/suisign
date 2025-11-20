export type DocStatus = "pending" | "signed" | "completed" | "rejected";

export interface UiDocument {
  id: string;
  subject: string;
  fromLabel: string;
  fromAvatar?: string;
  toLabels: string[];
  createdAt: string; // display string
  timestamp: number; // for sorting
  status: DocStatus;
  isUnread: boolean;
  messagePreview: string;
  contentBody?: string; // full mock body
  walrusBlobId?: string; // Walrus blob id
  tags?: string[];
}

export enum FolderType {
  INBOX = "Inbox",
  SENT = "Sent",
  DRAFTS = "Drafts",
  ARCHIVE = "Archive",
  TRASH = "Trash",
}

export type DocStatus = "pending" | "signed" | "completed" | "rejected";

export type ContentKind = "message" | "file";

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
  messagePreview?: string | null;
  // Body is not persisted in UI model; require decrypt to view.
  contentBody?: null;
  walrusBlobId?: string; // Walrus blob id
  walrusHashHex?: string;
  sealSecretId?: string;
  tags?: string[];
  signedByLabels?: string[];
  signedAddresses?: string[];
  signerAddresses?: string[];

  // Content metadata
  contentKind?: ContentKind;   // "message" (default) or "file"
  fileName?: string | null;
  mimeType?: string | null;
}

export enum FolderType {
  INBOX = "Inbox",
  SENT = "Sent",
  DRAFTS = "Drafts",
  ARCHIVE = "Archive",
  TRASH = "Trash",
}

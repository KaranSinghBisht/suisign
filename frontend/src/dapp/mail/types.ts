export type DocStatus = "pending" | "signed" | "completed" | "rejected";

export type ContentKind = "message" | "file";

export type DocumentKind = "richtext" | "pdf";

export type ComposeMode = DocumentKind;

export interface DocumentMetadata {
  kind: DocumentKind;
  subject: string;
  walrusBlobId: string;
  requiresHandSignature?: boolean;
  localSignatures?: {
    party: "sender" | "recipient";
    dataUrl: string; // base64 PNG of drawn sig
  }[];
}

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
  messagePreview: string; // plain-text preview
  message?: string; // full body (HTML or plain) for unencrypted docs
  // Body is not persisted in UI model; require decrypt to view encrypted content.
  contentBody?: null;
  walrusBlobId?: string; // Walrus blob id
  walrusHashHex?: string;
  sealSecretId?: string;
  tags?: string[];
  signedByLabels?: string[];
  signedAddresses?: string[];
  signerAddresses?: string[];
  senderAddress?: string;

  // Content metadata
  contentKind?: ContentKind;   // "message" (default) or "file"
  fileName?: string | null;
  mimeType?: string | null;
  metadata?: DocumentMetadata;
}

export enum FolderType {
  INBOX = "Inbox",
  SENT = "Sent",
  DRAFTS = "Drafts",
  ARCHIVE = "Archive",
  TRASH = "Trash",
}

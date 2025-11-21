import { UiDocument } from "./types";

export const MOCK_DOCUMENTS: UiDocument[] = [
  {
    id: "doc_1",
    subject: "Consulting Agreement - Q4 2024",
    fromLabel: "kryptos.sui",
    toLabels: ["me.sui"],
    createdAt: "10:42 AM",
    timestamp: 1732010000000,
    status: "pending",
    isUnread: true,
    messagePreview:
      "Please review the attached consulting agreement for the upcoming quarter. We need this signed before...",
    walrusBlobId: "blob_abc123",
    tags: ["Urgent", "Legal"],
  },
  {
    id: "doc_2",
    subject: "NDA for Project Walrus",
    fromLabel: "0x71...9a2b",
    toLabels: ["me.sui", "alice.sui"],
    createdAt: "Yesterday",
    timestamp: 1731923600000,
    status: "signed",
    isUnread: false,
    messagePreview:
      "Attached is the Non-Disclosure Agreement regarding the new infrastructure integration.",
    walrusBlobId: "blob_xyz789",
    tags: ["Project Walrus"],
  },
  {
    id: "doc_3",
    subject: "Invoice #4092 - Oct Services",
    fromLabel: "billing.sui",
    toLabels: ["me.sui"],
    createdAt: "Nov 17",
    timestamp: 1731837200000,
    status: "completed",
    isUnread: false,
    messagePreview:
      "Your invoice for October services is ready for payment and signature confirmation.",
    walrusBlobId: "blob_inv4092",
    tags: ["Finance"],
  },
  {
    id: "doc_4",
    subject: "Partnership Proposal v2",
    fromLabel: "dao.sui",
    toLabels: ["me.sui"],
    createdAt: "Nov 15",
    timestamp: 1731664400000,
    status: "rejected",
    isUnread: false,
    messagePreview:
      "Updated terms for the partnership. Let us know if these terms work for the council.",
    walrusBlobId: "blob_prop2",
    tags: ["Governance"],
  },
  {
    id: "doc_5",
    subject: "Welcome to SuiSign",
    fromLabel: "team.sui",
    toLabels: ["everyone"],
    createdAt: "Nov 01",
    timestamp: 1730454800000,
    status: "completed",
    isUnread: false,
    messagePreview:
      "Welcome to the future of decentralized document signing. Secure, fast, and on-chain.",
    walrusBlobId: "blob_welcome",
    tags: ["Onboarding"],
  },
];

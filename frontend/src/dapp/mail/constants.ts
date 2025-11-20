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
    contentBody:
      'This Consulting Agreement ("Agreement") is made and entered into as of November 19, 2024, by and between Kryptos Inc. ("Client") and the undersigned Consultant ("Consultant").\n\n1. SERVICES. Consultant agrees to perform the services described in Exhibit A attached hereto.\n2. COMPENSATION. Client shall pay Consultant at a rate of 500 SUI per hour.\n\n[Sign below using your Sui Wallet]',
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
    contentBody:
      "MUTUAL NON-DISCLOSURE AGREEMENT\n\nThis Agreement is entered into by and between the parties to protect the confidentiality of certain confidential information.\n\nThe parties hereby agree that all data stored on Walrus decentralized storage shall remain encrypted until authorized access is granted.",
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
    contentBody:
      "INVOICE #4092\n\nService Period: October 1 - October 31, 2024\nTotal Due: 1,250 SUI\n\nPlease sign to acknowledge receipt and authorize payment from the treasury multi-sig.",
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
    contentBody:
      "PARTNERSHIP PROPOSAL\n\nVersion 2.0\n\nChanges from v1:\n- Increased liquidity provision duration to 12 months.\n- Adjusted governance voting weight cap.\n\nStatus: REJECTED by Validator Set A.",
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
    contentBody:
      "Welcome to SuiSign!\n\nWe are thrilled to have you on board. SuiSign leverages the Sui blockchain for immutable signatures and Walrus for decentralized, cost-effective storage.\n\nGetting Started:\n1. Connect Wallet\n2. Upload a PDF\n3. Add Signers\n4. Send!\n\nHappy Signing,\nThe SuiSign Team",
    walrusBlobId: "blob_welcome",
    tags: ["Onboarding"],
  },
];

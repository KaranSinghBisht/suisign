# SuiSign

_On-chain agreements powered by **Sui + Walrus + Seal** with an AI-assisted, Notion-style editor._

SuiSign lets you draft, encrypt, and sign agreements directly with your Sui wallet.  
Documents are stored as encrypted blobs on Walrus, gated by Seal, and their signing
state is tracked on-chain.

---

## What SuiSign does

- **Wallet-native signatures**
  - Every agreement is tied to a Sui address.
  - Signing uses the connected wallet - no separate DocuSign account or email loop.

- **Secure messages & PDF uploads**
  - Compose rich-text agreements in-app, or
  - Upload a PDF to be encrypted, stored on Walrus, and referenced on-chain.

- **Notion-style rich editor**
  - Headings (H1-H3), bulleted & numbered lists, dividers.
  - Inline bold/italic with keyboard shortcuts.
  - A little **"+" block menu** on empty lines to switch between text, headings, lists, etc.
  - Full-width writing surface instead of a tiny email textarea.

- **AI-assisted drafting**
  - "Draft with AI" button that refines or generates the contract body.
  - Templates provide a skeleton (Consulting, NDA, Payment confirmation); AI fills in details.
  - Output is HTML, so headings, lists, and emphasis render correctly in the editor & viewer.

- **End-to-end encryption with Walrus + Seal**
  - Raw document (HTML or PDF bytes) is encrypted in the browser.
  - Ciphertext is stored on Walrus; decryption is gated via Seal for the listed signers.
  - The app never sees your plaintext doc outside the local session.

- **On-chain document & signing state**
  - Each secure doc has an on-chain object with:
    - subject, walrus blob pointer, hash, seal secret id
    - signer addresses
    - signatures & completion state
  - UI tags show `Pending signature`, `Signed`, `Completed`, `On-chain`, `Local`.

- **Inbox / Sent dashboard**
  - Email-like layout:
    - Left: folders & wallet identity
    - Middle: document list
    - Right: reading pane _or_ inline compose panel
  - Mobile-aware: list and detail views with a back button.

---

## High-level architecture

- **Frontend**
  - React + TypeScript
  - Vite dev server
  - TailwindCSS for styling
  - Tiptap for the rich-text editor
  - `@mysten/dapp-kit` for Sui wallet connection & transactions

- **Storage & crypto**
  - **Walrus** - content-addressed blob storage for encrypted document bytes.
  - **Seal** - manages who can decrypt a given Walrus blob.
  - AES / hybrid encryption runs client-side before upload.

- **On-chain**
  - Sui Move contract for:
    - creating document objects
    - tracking signers
    - recording signatures & completion
  - Frontend polls on-chain state periodically to keep status in sync.

- **AI**
  - `draftAgreementWithAI` helper encapsulates the "Draft with AI" call.
  - It receives:
    - subject
    - signer list
    - existing message (if any)
    - optional AI instructions
  - Returns HTML that is injected into the TipTap editor.

---

## Main features in the UI

### Compose panel

- Opens inline in the right column (no more tiny modal).
- Two modes:
  - **Secure message** - rich-text editor, AI templates and instructions.
  - **Upload document (PDF)** - file input with size/type validation.
- Fields:
  - Subject
  - Signers (handles or addresses)
  - Optional template selector
  - Optional "AI instructions"
  - Message body (rich text) or PDF upload
- Actions:
  - **Draft with AI**
  - **Create secure doc**
  - Cancel

### Rich text editor

- TipTap with:
  - StarterKit (paragraph, text, headings, lists, etc.)
  - Placeholder
  - Focus highlighting
- UX bits:
  - Fixed toolbar for bold / italic / lists / divider.
  - Heading dropdown (`Text`, `H1`, `H2`, `H3`).
  - Line-level focus styling (`.has-focus`).
  - "+" block switcher that only appears on an empty focused line.

### Reading pane

- Shows decrypted document:
  - Rich HTML rendering for messages.
  - Download / view link for PDFs.
- Metadata:
  - Subject, from, to, tags.
  - Status pill (`Pending signature`, `Signed`, `Completed`).
- Actions:
  - **Sign** (only for listed signers with wallet connected).
  - Decrypt button when content is locked.

---

## Getting started

> These steps assume you're running the **frontend only**.  
> Wallet, Walrus, Seal, and AI endpoints should already be configured in the code / env to match your setup.

### Prerequisites

- Node.js >= 18
- npm or pnpm
- A Sui wallet (e.g. Sui Wallet) with devnet/testnet funds
- Access to:
  - Walrus endpoint
  - Seal config
  - An AI endpoint for `draftAgreementWithAI` (OpenAI or your own LLM)

### Run the frontend

```bash
# from repo root
cd frontend

# install deps
npm install

# start dev server
npm run dev
```

Then open the URL printed by Vite (usually http://localhost:5173).

## Typical demo flow

1. Connect wallet
   - Connect a Sui wallet and note the handle/address in the top-right.
2. Create a new secure document
   - Click "Send new doc" in the sidebar.
   - Choose Secure message.
   - Fill:
     - Subject: Consulting agreement - Q4 2025
     - Signers: your-handle.sui, other-address
     - Pick a template (for example: "Consulting Agreement (basic)").
3. Let AI clean it up
   - Optionally tweak "Optional AI instructions".
   - Click Draft with AI to refine wording; formatting stays as headings and lists.
4. Create and send
   - Click Create secure doc.
   - Watch: on-chain transaction via wallet; Walrus/Seal metadata added; document appears in Sent (for you) and Inbox (for signers).
5. Sign as another wallet
   - Switch to another signer's wallet (or open another browser profile).
   - Open the same document from the Inbox.
   - Click Decrypt -> Sign document.
   - Status transitions from Pending signature -> Signed -> Completed when all signers sign.
6. Reopen and verify
   - Re-open the document as either party and confirm formatting and on-chain tags (On-chain, Signed, etc.).

## Project structure (frontend)

```
frontend/
  src/
    App.tsx
    App.css
    main.tsx
    ai/
      draftAgreement.ts
    chain/
      documentQueries.ts
    components/
      RichTextEditor.tsx
    dapp/
      DappApp.tsx
      mail/
        Badge.tsx
        ComposePanel.tsx
        DocumentList.tsx
        MailDashboard.tsx
        ReadingPane.tsx
        Sidebar.tsx
        constants.ts
        createFromCompose.ts
        signDocument.ts
        templates.ts
        types.ts
    landing/
      App.tsx
    utils/
      text.ts
    storage.ts
    cryptoHelpers.ts
    walrusClient.ts
    sealClient.ts
    handleRegistry.ts
    networkConfig.ts
    OwnedObjects.tsx
    WalletStatus.tsx
```

## License

MIT License.

## Credits

Built on:
- Sui
- Walrus
- Seal (or your deployment)
- Tiptap
- @mysten/dapp-kit

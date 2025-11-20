// /frontend/src/dapp/mail/signDocument.ts
import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = import.meta.env.VITE_SUISIGN_PACKAGE_ID as string;
const CLOCK_OBJECT_ID = "0x6";

type SignAndExecuteFn = (args: { transaction: Transaction }) => Promise<any>;

export async function signDocumentOnChain(
  documentId: string,
  signAndExecute: SignAndExecuteFn,
) {
  console.log("[SuiSign] Signing document", documentId);

  if (!documentId || !documentId.startsWith("0x")) {
    throw new Error(
      "This document only exists locally and has no on-chain id yet. Please create a fresh document with the latest version of SuiSign.",
    );
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::document::sign_document`,
    arguments: [
      tx.object(documentId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result = await signAndExecute({ transaction: tx });

  console.log("[SuiSign] sign_document result:", result);
  return result;
}

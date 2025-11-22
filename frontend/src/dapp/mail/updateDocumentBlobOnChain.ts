import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = import.meta.env.VITE_SUISIGN_PACKAGE_ID as string;

export type SignAndExecuteFn = (args: {
  transaction: Transaction;
  options?: any;
}) => Promise<any>;

export async function updateDocumentBlobOnChain(args: {
  docObjectId: string;
  newBlobId: string;
  newHashHex: string;
  signAndExecute: SignAndExecuteFn;
}) {
  const { docObjectId, newBlobId, newHashHex, signAndExecute } = args;

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::document::update_document_blob`,
    arguments: [
      tx.object(docObjectId),
      tx.pure.string(newBlobId),
      tx.pure.string(newHashHex),
    ],
  });

  return signAndExecute({
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
}

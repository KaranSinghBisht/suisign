// This is a stub for Walrus.
// For hackathon, you can replace saveEncryptedBlob / fetchEncryptedBlob
// with real Walrus publish / fetch.

import { toBase64 } from './cryptoHelpers';

export type StoredBlob = {
	cipherB64: string;
	ivB64: string;
	mimeType: string;
	fileName: string;
};

const STORAGE_PREFIX = 'suisign_blob_';

export async function saveEncryptedBlob(
	cipherBytes: Uint8Array,
	ivB64: string,
	mimeType: string,
	fileName: string,
): Promise<string> {
	const id = `local-${crypto.randomUUID()}`;

	const record: StoredBlob = {
		cipherB64: toBase64(cipherBytes),
		ivB64,
		mimeType,
		fileName,
	};

	localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(record));

	// In real Walrus integration, this would be the walrus_blob_id
	return id;
}

export async function fetchEncryptedBlob(blobId: string): Promise<StoredBlob | null> {
	const raw = localStorage.getItem(STORAGE_PREFIX + blobId);
	if (!raw) return null;
	return JSON.parse(raw) as StoredBlob;
}

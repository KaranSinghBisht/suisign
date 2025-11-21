// /frontend/src/cryptoHelpers.ts
import { storeEncryptedBlobToWalrus } from "./storage";
// Utility: convert ArrayBuffer to hex
export function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// Utility: base64 encode (safe for large Uint8Array)
export function toBase64(bytes: Uint8Array): string {
	const chunkSize = 0x8000; // 32,768 bytes per chunk
	let binary = '';
  
	for (let i = 0; i < bytes.length; i += chunkSize) {
	  const chunk = bytes.subarray(i, i + chunkSize);
	  binary += String.fromCharCode(...chunk);
	}
  
	return btoa(binary);
  }

export function fromBase64(b64: string): Uint8Array {
	const binStr = atob(b64);
	const bytes = new Uint8Array(binStr.length);
	for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
	return bytes;
}

// Hash plaintext bytes with SHA-256
export async function sha256(buffer: ArrayBuffer): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', buffer);
	return toHex(hash);
}

// Encrypt document bytes with AES-GCM 256
export async function encryptDocument(
	plaintext: ArrayBuffer,
): Promise<{
	cipherBytes: Uint8Array;
	keyB64: string;
	ivB64: string;
}> {
	// 1. Generate random AES-GCM key
	const key = await crypto.subtle.generateKey(
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt', 'decrypt'],
	);

	// export key for sharing/storing (base64)
	const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
	const keyB64 = toBase64(rawKey);

	// 2. Random 12-byte IV
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ivB64 = toBase64(iv);

	// 3. Encrypt
	const cipherBuf = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		plaintext,
	);

	return {
		cipherBytes: new Uint8Array(cipherBuf),
		keyB64,
		ivB64,
	};
}

// Decrypt using AES-GCM with base64 key + iv
export async function decryptDocument(
	cipherBytes: Uint8Array,
	keyB64: string,
	ivB64: string,
): Promise<ArrayBuffer> {
	const rawKey = fromBase64(keyB64);
	const key = await crypto.subtle.importKey(
		'raw',
		rawKey.buffer as ArrayBuffer,
		{ name: 'AES-GCM', length: 256 },
		false,
		['decrypt'],
	);

	const iv = fromBase64(ivB64);
	const ivBuffer = iv.buffer as ArrayBuffer;

	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: ivBuffer },
		key,
		cipherBytes.buffer as ArrayBuffer,
	);

	return plaintext;
}

export type EncryptedWalrusResult = {
	blobId: string;
  walrusBlobObjectId?: string;
	hashHex: string;
	ivB64: string;
	keyB64: string;
};

export async function encryptMessageAndUploadToWalrus(opts: {
	subject: string;
	message: string;
	senderAddress: string;
}): Promise<EncryptedWalrusResult> {
	const payload = {
		v: 1,
		kind: 'text_message',
		subject: opts.subject,
		message: opts.message,
		sender: opts.senderAddress,
		createdAt: new Date().toISOString(),
	};

	const encoder = new TextEncoder();
	const payloadBytes = encoder.encode(JSON.stringify(payload));
	const { cipherBytes, keyB64, ivB64 } = await encryptDocument(payloadBytes.buffer);
	const hashHex = await sha256(payloadBytes.buffer);

	const cipherB64 = toBase64(cipherBytes);
	const walrusMeta = await storeEncryptedBlobToWalrus({
		cipherB64,
		epochs: 5,
	});

	return {
		blobId: walrusMeta.blobId,
    walrusBlobObjectId: walrusMeta.objectId,
		hashHex,
		ivB64,
		keyB64,
	};
}

export async function decryptMessageFromWalrus(input: {
	cipherB64: string;
	keyB64: string;
	ivB64: string;
}): Promise<string> {
	const cipherBytes = fromBase64(input.cipherB64);
	const plaintextBuffer = await decryptDocument(cipherBytes, input.keyB64, input.ivB64);
	const decoder = new TextDecoder();
	return decoder.decode(new Uint8Array(plaintextBuffer));
}

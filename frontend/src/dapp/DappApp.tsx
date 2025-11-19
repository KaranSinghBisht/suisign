// frontend/src/dapp/DappApp.tsx
import { useState, useEffect, ChangeEvent } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  ExternalLink,
  FileSignature,
  ShieldCheck,
  Wallet,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Fingerprint,
} from "lucide-react";
import "../App.css";
import {
  decryptDocument,
  encryptDocument,
  fromBase64,
  sha256,
} from "../cryptoHelpers";
import { fetchEncryptedBlob, saveEncryptedBlob } from "../storage";

const PACKAGE_ID = import.meta.env.VITE_SUISIGN_PACKAGE_ID as string;
const LAST_CREATED_STORAGE_KEY = "suisign_last_created";

type CreatedDocInfo = {
  objectId: string;
  blobId: string;
  keyB64: string;
  ivB64: string;
  hashHex: string;
};

export default function DappApp() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Form States
  const [sealKeyId, setSealKeyId] = useState("demo-seal-key-id");
  const [signers, setSigners] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Action States
  const [docIdToSign, setDocIdToSign] = useState("");
  const [inspectId, setInspectId] = useState("");
  const [inspectResult, setInspectResult] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Document Metadata
  const [lastCreatedDocInfo, setLastCreatedDocInfo] = useState<CreatedDocInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Feedback States
  const [pendingTx, setPendingTx] = useState<string | null>(null); // 'create' | 'sign' | null
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
    digest?: string;
  } | null>(null);

  // Auto-fill signers with current address on connect
  useEffect(() => {
    if (currentAccount && !signers) {
      setSigners(currentAccount.address);
    }
  }, [currentAccount, signers]);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_CREATED_STORAGE_KEY);
    if (!saved) return;
    try {
      setLastCreatedDocInfo(JSON.parse(saved) as CreatedDocInfo);
    } catch (err) {
      console.error("Failed to parse saved document info", err);
    }
  }, []);

  // --- Helpers ---

  const showToast = (type: "success" | "error", message: string, digest?: string) => {
    setToast({ type, message, digest });
    // Auto dismiss after 5s
    setTimeout(() => setToast(null), 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Minimal feedback could go here
  };

  const truncate = (str: string, n = 6) =>
    str ? `${str.slice(0, n)}...${str.slice(-n)}` : "";

  // --- Handlers ---

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileToUpload(file);
  };

  const handleCreateDocument = async () => {
    if (!currentAccount) return;
    if (!fileToUpload) {
      showToast("error", "Please choose a PDF or text file to upload.");
      return;
    }
    setPendingTx("create");

    try {
      const buffer = await fileToUpload.arrayBuffer();
      const hashHex = await sha256(buffer);
      const { cipherBytes, keyB64, ivB64 } = await encryptDocument(buffer);

      const blobId = await saveEncryptedBlob(
        cipherBytes,
        ivB64,
        fileToUpload.type || "application/octet-stream",
        fileToUpload.name
      );

      const tx = new Transaction();

      const signersList = signers
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (!signersList.length && currentAccount) {
        signersList.push(currentAccount.address);
      }

      if (!signersList.length) {
        showToast("error", "Please enter at least one signer address.");
        setPendingTx(null);
        return;
      }

      tx.moveCall({
        target: `${PACKAGE_ID}::document::create_document`,
        arguments: [
          tx.pure.string(blobId),
          tx.pure.string(hashHex),
          tx.pure.string(sealKeyId),
          tx.pure.vector("address", signersList),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result: any) => {
            setPendingTx(null);
            showToast("success", "Document created successfully!", result.digest);

            const createdDocChange = result.objectChanges?.find(
              (change: any) =>
                change.type === "created" &&
                typeof change.objectType === "string" &&
                change.objectType.includes("::document::Document")
            );

            const objectId = createdDocChange?.objectId ?? "";

            const payload: CreatedDocInfo = {
              objectId,
              blobId,
              keyB64,
              ivB64,
              hashHex,
            };

            setLastCreatedDocInfo(payload);
            localStorage.setItem(
              LAST_CREATED_STORAGE_KEY,
              JSON.stringify(payload)
            );

            if (objectId) {
              setDocIdToSign(objectId);
              setInspectId(objectId);
            }
          },
          onError: (err) => {
            setPendingTx(null);
            showToast("error", `Creation failed: ${err.message}`);
          },
        }
      );
    } catch (err: any) {
      console.error(err);
      setPendingTx(null);
      showToast("error", `Encryption or upload failed: ${err.message}`);
    }
  };

  const handleSignDocument = () => {
    if (!currentAccount || !docIdToSign) return;
    const trimmedId = docIdToSign.trim();
    if (!trimmedId) return;
    setPendingTx("sign");

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::document::sign_document`,
      arguments: [
        tx.object(trimmedId),
        tx.object("0x6"), // Clock
      ],
    });

    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: (result) => {
          setPendingTx(null);
          showToast("success", "Document signed successfully!", result.digest);
        },
        onError: (err) => {
          setPendingTx(null);
          showToast("error", `Signing failed: ${err.message}`);
        },
      }
    );
  };

  const handleInspect = async () => {
    if (!inspectId) return;
    setInspectLoading(true);
    setInspectResult(null);

    try {
      const res = await client.getObject({
        id: inspectId,
        options: { showContent: true },
      });

      if (res.error) throw new Error(res.error.code);
      setInspectResult(res.data);
    } catch (err: any) {
      showToast("error", `Fetch failed: ${err.message}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDownloadAndDecrypt = async () => {
    if (!inspectResult || !lastCreatedDocInfo) return;
    if (inspectResult?.objectId !== lastCreatedDocInfo.objectId) {
      showToast("error", "Stored encryption key does not match this document.");
      return;
    }

    setIsDownloading(true);

    try {
      const stored = await fetchEncryptedBlob(lastCreatedDocInfo.blobId);
      if (!stored) {
        showToast(
          "error",
          "Encrypted file not found in local storage (Walrus stub)."
        );
        return;
      }

      const cipherBytes = fromBase64(stored.cipherB64);
      const plaintext = await decryptDocument(
        cipherBytes,
        lastCreatedDocInfo.keyB64,
        stored.ivB64
      );

      const blob = new Blob([plaintext], { type: stored.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = stored.fileName || "document";
      a.click();
      URL.revokeObjectURL(url);

      showToast("success", "Document decrypted. Download should start shortly.");
    } catch (err: any) {
      showToast("error", `Decrypt failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine if the currently inspected object matches our last locally-encrypted doc
  const canDecryptCurrent =
    !!inspectResult &&
    !!lastCreatedDocInfo &&
    inspectResult.content?.dataType === "moveObject" &&
    ((lastCreatedDocInfo.objectId &&
      inspectResult.objectId === lastCreatedDocInfo.objectId) ||
      inspectResult.content?.fields?.doc_hash === lastCreatedDocInfo.hashHex);

  // --- UI Components ---

  return (
    <>
      <div className="grain-overlay" />
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <ShieldCheck size={24} className="text-blue-400" style={{ color: 'var(--sui-cyan)' }} />
          <span>SuiSign</span>
          <span className="beta-badge">HACKATHON</span>
        </div>
        <div>
          <ConnectButton />
        </div>
      </nav>

      <div className="app-container">
        <div className="grid-layout">
          
          {/* 1. Wallet Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card"
          >
            <div className="card-header">
              <h2 className="card-title">
                <Wallet size={20} /> Wallet Status
              </h2>
              <p className="card-desc">Your identity on the network.</p>
            </div>

            {currentAccount ? (
              <div>
                <div className="label">Connected Address</div>
                <div className="wallet-row">
                  <span className="address-mono">{currentAccount.address}</span>
                  <button 
                    onClick={() => copyToClipboard(currentAccount.address)} 
                    className="btn-icon"
                    title="Copy Address"
                  >
                    <Copy size={16} color="var(--text-muted)" />
                  </button>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--success)' }}>
                  ● Connected to Network
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>
                <p>Please connect your wallet to continue.</p>
              </div>
            )}
          </motion.div>

          {/* 2. Create Document */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass-card"
          >
            <div className="card-header">
              <h2 className="card-title">
                <FileSignature size={20} /> Create Document
              </h2>
              <p className="card-desc">Initialize a new signing flow on-chain.</p>
            </div>

            <div className="input-group">
              <label className="label">Upload document (PDF / text)</label>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="input-field"
                style={{ padding: "0.5rem" }}
              />
              {fileToUpload && (
                <p
                  style={{
                    fontSize: "0.85rem",
                    marginTop: "0.5rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Selected:{" "}
                  <span className="address-mono">{fileToUpload.name}</span> (
                  {Math.max(1, Math.round(fileToUpload.size / 1024))} KB)
                </p>
              )}
            </div>

            <div className="input-group">
              <label className="label">Seal Key ID</label>
              <input
                className="input-field"
                value={sealKeyId}
                onChange={(e) => setSealKeyId(e.target.value)}
                placeholder="Enter seal key identifier..."
              />
            </div>

            <div className="input-group">
              <label className="label">Signers (Addresses)</label>
              <input
                className="input-field"
                value={signers}
                onChange={(e) => setSigners(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCreateDocument}
              disabled={!currentAccount || !fileToUpload || pendingTx === "create"}
            >
              {pendingTx === "create" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ marginLeft: "0.5rem" }}>Encrypting...</span>
                </>
              ) : !fileToUpload ? (
                "Select a document to upload"
              ) : (
                "Encrypt & Create On-Chain"
              )}
            </button>

            {lastCreatedDocInfo && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(5, 6, 8, 0.6)",
                }}
              >
                <div className="detail-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
                  <div className="label" style={{ fontSize: "0.85rem" }}>
                    Last Document Hash
                  </div>
                  <div className="detail-value" style={{ fontSize: "0.8rem" }}>
                    {lastCreatedDocInfo.hashHex.slice(0, 32)}…
                  </div>
                </div>
                {lastCreatedDocInfo.objectId && (
                  <div
                    className="detail-row"
                    style={{ borderBottom: "none", marginTop: "0.5rem", paddingTop: 0 }}
                  >
                    <div className="label" style={{ fontSize: "0.85rem" }}>
                      Document Object
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ width: "auto", padding: "0.35rem 0.75rem" }}
                      onClick={() => {
                        setDocIdToSign(lastCreatedDocInfo.objectId);
                        setInspectId(lastCreatedDocInfo.objectId);
                        copyToClipboard(lastCreatedDocInfo.objectId);
                        showToast("success", "Document ID copied to clipboard.");
                      }}
                    >
                      Use Object ID
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* 3. Sign Document */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="glass-card"
          >
            <div className="card-header">
              <h2 className="card-title">
                <Fingerprint size={20} /> Sign Document
              </h2>
              <p className="card-desc">Execute a transaction to append your signature.</p>
            </div>

            <div className="input-group">
              <label className="label">Document Object ID</label>
              <input
                className="input-field"
                value={docIdToSign}
                onChange={(e) => setDocIdToSign(e.target.value)}
                placeholder="0x..."
              />
            </div>

            {currentAccount && (
               <p className="label" style={{ marginBottom: '1rem' }}>
                 Signing as: <span className="text-blue-400">{truncate(currentAccount.address)}</span>
               </p>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSignDocument}
              disabled={!currentAccount || !docIdToSign.trim() || pendingTx === "sign"}
            >
              {pendingTx === "sign" ? <Loader2 className="animate-spin" /> : "Sign Document"}
            </button>
          </motion.div>

          {/* 4. Inspect Document */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="glass-card"
          >
            <div className="card-header">
              <h2 className="card-title">
                <Search size={20} /> View Details
              </h2>
              <p className="card-desc">Fetch live object state from Sui network.</p>
            </div>

            <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input-field"
                value={inspectId}
                onChange={(e) => setInspectId(e.target.value)}
                placeholder="Enter Document Object ID..."
              />
              <button 
                className="btn btn-secondary" 
                style={{ width: 'auto' }}
                onClick={handleInspect}
                disabled={inspectLoading}
              >
                {inspectLoading ? <Loader2 className="animate-spin" /> : "Fetch"}
              </button>
            </div>

            <AnimatePresence>
              {inspectResult && inspectResult.content?.dataType === "moveObject" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="inspector-result"
                >
                  {(() => {
                    const fields = inspectResult.content.fields;
                    const isFullySigned = fields.fully_signed;
                    return (
                      <div style={{ marginTop: '1.5rem' }}>
                        <div className="detail-row">
                          <div className="label">Status</div>
                          <div>
                            {isFullySigned ? (
                              <span className="status-pill status-success">Fully Signed ✅</span>
                            ) : (
                              <span className="status-pill status-pending">Waiting for signatures ⏳</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="detail-row">
                          <div className="label">Walrus Blob ID</div>
                          <div className="detail-value">{fields.walrus_blob_id}</div>
                        </div>

                        <div className="detail-row">
                          <div className="label">Required Signers</div>
                          <div className="detail-value">
                            {fields.allowed_signers?.map((s: string, i: number) => (
                              <div key={i}>{truncate(s, 8)}</div>
                            ))}
                          </div>
                        </div>

                        <div className="detail-row" style={{ borderBottom: 'none' }}>
                          <div className="label">Signatures</div>
                          {fields.signatures && fields.signatures.length > 0 ? (
                            fields.signatures.map((sig: any, i: number) => (
                              <div key={i} className="detail-value" style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>
                                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--success)' }} />
                                {truncate(sig.signer || sig.fields?.signer)} @ {new Date(Number(sig.timestamp_ms || sig.fields?.timestamp_ms)).toLocaleTimeString()}
                              </div>
                            ))
                          ) : (
                            <div className="detail-value" style={{ opacity: 0.5 }}>No signatures yet</div>
                          )}
                        </div>

                        {canDecryptCurrent && (
                          <button
                            style={{ marginTop: "1rem" }}
                            className="btn btn-secondary"
                            onClick={handleDownloadAndDecrypt}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                <span style={{ marginLeft: "0.5rem" }}>
                                  Preparing download...
                                </span>
                              </>
                            ) : (
                              "Download & Decrypt"
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>

      {/* Global Feedback Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast-container`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className={`toast ${toast.type}`}>
              {toast.type === "success" ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {toast.type === "success" ? "Success" : "Error"}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{toast.message}</div>
                {toast.digest && (
                  <a 
                    href={`https://suiscan.xyz/tx/${toast.digest}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      marginTop: '8px', 
                      color: 'var(--sui-cyan)',
                      textDecoration: 'none',
                      fontSize: '0.8rem'
                    }}
                  >
                    View on Explorer <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

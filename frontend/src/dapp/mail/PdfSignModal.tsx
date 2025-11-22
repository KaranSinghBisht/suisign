import React from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import { PdfViewerWithSign } from "./PdfViewerWithSign";

GlobalWorkerOptions.workerSrc = pdfWorker;

type Position = {
  xNorm: number;
  yNorm: number;
  wNorm: number;
  hNorm: number;
};

type PdfSignModalProps = {
  pdfBytes: Uint8Array;
  canSign: boolean;
  existingSignatureDataUrl?: string;
  onClose: () => void;
  onSigned: (args: { dataUrl: string; position: Position }) => Promise<void>;
};

export const PdfSignModal: React.FC<PdfSignModalProps> = ({
  pdfBytes,
  canSign,
  existingSignatureDataUrl,
  onClose,
  onSigned,
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function generate() {
      setIsLoading(true);
      setError(null);
      try {
        const data = pdfBytes.slice();
        const loadingTask = getDocument({ data });
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D context not available");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page
          .render({ canvasContext: context, viewport, canvas })
          .promise;

        if (!cancelled) {
          const url = canvas.toDataURL("image/png");
          setPreviewUrl(url);
        }
      } catch (err: any) {
        console.error("[SuiSign] failed to generate sign preview", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to render PDF preview");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  if (!canSign) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-100">
            Draw &amp; place your signature
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-950/80 flex items-center justify-center">
          {isLoading && (
            <span className="text-xs text-slate-400">Rendering PDF…</span>
          )}
          {error && (
            <span className="text-xs text-red-400">
              Failed to render PDF: {error}
            </span>
          )}
          {!isLoading && !error && previewUrl && (
            <PdfViewerWithSign
              pdfUrl={previewUrl}
              canSign={canSign}
              existingSignatureDataUrl={existingSignatureDataUrl}
              onSigned={onSigned}
            />
          )}
        </div>
      </div>
    </div>
  );
};

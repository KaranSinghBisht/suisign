import React from "react";

type PdfViewerWithSignProps = {
  pdfUrl: string;
  canSign: boolean;
  onSigned: (args: {
    dataUrl: string;
    position: {
      xNorm: number;
      yNorm: number;
      wNorm: number;
      hNorm: number;
    };
  }) => Promise<void>;
  existingSignatureDataUrl?: string;
};

type SignatureModalProps = {
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

function SignatureModal({ onCancel, onConfirm }: SignatureModalProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: any) => {
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e: any) => {
      if (!drawing) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    };

    const stop = () => {
      drawing = false;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);

    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-[420px] space-y-3">
        <p className="text-xs text-slate-300">
          Draw your signature below. It will be attached to this PDF and
          confirmed with your Sui wallet.
        </p>
        <canvas
          ref={canvasRef}
          width={380}
          height={160}
          className="bg-slate-800 rounded border border-slate-700 cursor-crosshair"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md border border-slate-700 text-slate-200"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md bg-sky-600 hover:bg-sky-500 text-white"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const dataUrl = canvas.toDataURL("image/png");
              onConfirm(dataUrl);
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function PdfViewerWithSign(props: PdfViewerWithSignProps) {
  const { pdfUrl, canSign, onSigned, existingSignatureDataUrl } = props;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [isSigning, setIsSigning] = React.useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<
    string | null
  >(existingSignatureDataUrl ?? null);

  // position in px inside container
  const [sigPos, setSigPos] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  React.useEffect(() => {
    if (existingSignatureDataUrl && !signatureDataUrl) {
      setSignatureDataUrl(existingSignatureDataUrl);
    }
  }, [existingSignatureDataUrl, signatureDataUrl]);

  const handleMouseDownSig = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>,
  ) => {
    if (!signatureDataUrl) return;
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragOffset.current = {
      x: x - sigPos.x,
      y: y - sigPos.y,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !signatureDataUrl) return;
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    let x = e.clientX - rect.left - dragOffset.current.x;
    let y = e.clientY - rect.top - dragOffset.current.y;

    // clamp inside container
    const sigWidth = 160;
    const sigHeight = 60;
    x = Math.max(0, Math.min(x, rect.width - sigWidth));
    y = Math.max(0, Math.min(y, rect.height - sigHeight));

    setSigPos({ x, y });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="inline-block relative border border-slate-800 rounded-lg overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        ref={imgRef}
        src={pdfUrl}
        className="block max-w-full h-auto"
        alt="PDF preview"
      />

      {/* draggable signature overlay */}
      {signatureDataUrl && (
        <img
          src={signatureDataUrl}
          alt="Signature"
          className="absolute h-16 bg-slate-900/60 border border-slate-700 rounded shadow cursor-move"
          style={{
            left: sigPos.x,
            top: sigPos.y,
            width: 160,
            height: 60,
          }}
          onMouseDown={handleMouseDownSig}
        />
      )}

      {canSign && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            type="button"
            onClick={() => setIsSigning(true)}
            className="px-3 py-1.5 text-xs rounded-md bg-sky-600 hover:bg-sky-500 text-white"
          >
            Draw signature
          </button>
          {signatureDataUrl && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-600 text-slate-100 bg-slate-900/80 hover:bg-slate-800"
              onClick={async () => {
                const rect = imgRef.current?.getBoundingClientRect();
                if (!rect) return;
                const sigWidth = 160;
                const sigHeight = 60;
                await onSigned({
                  dataUrl: signatureDataUrl,
                  position: {
                    xNorm: sigPos.x / rect.width,
                    yNorm: sigPos.y / rect.height,
                    wNorm: sigWidth / rect.width,
                    hNorm: sigHeight / rect.height,
                  },
                });
              }}
            >
              Confirm & sign
            </button>
          )}
        </div>
      )}

      {isSigning && (
        <SignatureModal
          onCancel={() => setIsSigning(false)}
          onConfirm={(dataUrl) => {
            setIsSigning(false);
            setSignatureDataUrl(dataUrl);
            // default position: bottom-right-ish
            const img = imgRef.current;
            if (img) {
              const rect = img.getBoundingClientRect();
              setSigPos({
                x: rect.width - 200,
                y: rect.height - 120,
              });
            }
          }}
        />
      )}
    </div>
  );
}

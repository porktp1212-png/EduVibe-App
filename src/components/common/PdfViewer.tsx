import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { dataUrlToBlob, downloadOrOpenFile } from '../../lib/fileUpload';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
  } catch (e) {
    console.warn('PDF.js worker initialization notice:', e);
  }
}

interface PdfViewerProps {
  file: {
    name: string;
    url?: string;
    data?: string;
    size?: number;
  };
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate safe same-origin Blob URL for fallback or new-tab viewing
  useEffect(() => {
    let activeUrl: string | null = null;
    try {
      if (file.data && file.data.startsWith('data:')) {
        const blob = dataUrlToBlob(file.data, 'application/pdf');
        activeUrl = URL.createObjectURL(blob);
        setBlobUrl(activeUrl);
      } else if (file.url && file.url.startsWith('/api/files/')) {
        setBlobUrl(file.url);
      } else if (file.url) {
        setBlobUrl(file.url);
      }
    } catch (err) {
      console.warn('Error preparing blob URL:', err);
    }

    return () => {
      if (activeUrl && activeUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(activeUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [file.data, file.url]);

  // Load the PDF Document using PDF.js
  const loadPdfDocument = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Cancel existing render if any
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
      renderTaskRef.current = null;
    }

    try {
      let loadingTask: any = null;

      // 1. Prefer base64 data if available: convert to Uint8Array directly
      if (file.data && file.data.startsWith('data:')) {
        const base64Index = file.data.indexOf(';base64,');
        const b64 = base64Index !== -1 ? file.data.substring(base64Index + 8) : file.data;
        const binaryStr = atob(b64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });
      } else if (file.url) {
        // 2. Load from URL (e.g. /api/files/...)
        loadingTask = pdfjsLib.getDocument({
          url: file.url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });
      } else if (file.data) {
        // Raw base64 string
        const binaryStr = atob(file.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({
          data: bytes,
        });
      } else {
        throw new Error('ไม่พบข้อมูลไฟล์ PDF');
      }

      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setIsLoading(false);
    } catch (err: any) {
      console.warn('PDF.js render notice:', err);
      // If render failed, allow fallback
      setErrorMessage(
        err?.message || 'ไม่สามารถประมวลผลไฟล์ PDF ผ่านหน้าจอได้โดยตรง'
      );
      setIsLoading(false);
    }
  }, [file.data, file.url]);

  useEffect(() => {
    loadPdfDocument();
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }
    };
  }, [loadPdfDocument]);

  // Render current page to canvas whenever page, scale, or rotation changes
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || isLoading) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
          renderTaskRef.current = null;
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });

        // Use pixel ratio for ultra-crisp text on high-DPI (Retina) screens
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Canvas page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [currentPage, scale, rotation, isLoading]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleFitWidth = () => {
    if (containerRef.current && pdfDocRef.current) {
      pdfDocRef.current.getPage(currentPage).then((page: any) => {
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const containerWidth = containerRef.current?.clientWidth || 700;
        const availableWidth = Math.max(containerWidth - 60, 320);
        const newScale = availableWidth / unscaledViewport.width;
        setScale(Number(newScale.toFixed(2)));
      });
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    downloadOrOpenFile(file.data || file.url, file.name, true);
  };

  const handleOpenNewTab = () => {
    downloadOrOpenFile(file.data || file.url, file.name, false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* PDF Controls Toolbar */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading || numPages <= 0}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors text-white"
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold px-2 text-slate-300">
            {numPages > 0 ? `หน้า ${currentPage} / ${numPages}` : 'กำลังโหลด...'}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isLoading || numPages <= 0}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors text-white"
            title="หน้าถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || isLoading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            title="ย่อขนาด (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium px-1 text-slate-300 min-w-[44px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || isLoading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            title="ขยายขนาด (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            disabled={isLoading || numPages <= 0}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1"
            title="พอดีความกว้าง"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">พอดีจอ</span>
          </button>

          <button
            type="button"
            onClick={handleRotate}
            disabled={isLoading || numPages <= 0}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="หมุน 90 องศา"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="px-2.5 py-1.5 rounded-lg bg-teal-600/80 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="เปิดดูในแท็บใหม่"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">เปิดในแท็บใหม่</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="ดาวน์โหลด PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ดาวน์โหลด</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        className="grow overflow-auto p-4 sm:p-6 bg-slate-900/95 flex items-center justify-center min-h-[420px] max-h-[72vh]"
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
            <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
            <p className="text-sm font-medium">กำลังเตรียมและโหลดหน้าเอกสาร PDF...</p>
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="max-w-md w-full p-6 bg-slate-800/90 rounded-2xl border border-slate-700 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">ไม่สามารถแสดงผลผ่านหน้าต่างนี้ได้</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                เนื่องจากเบราว์เซอร์หรืออุปกรณ์อาจจำกัดการแสดงตัวอย่าง PDF ภายในหน้าเว็บ
                ท่านสามารถเปิดดูในแท็บใหม่หรือดาวน์โหลดไฟล์เพื่อเปิดด้วยโปรแกรมอ่าน PDF ได้ทันที
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดดูในแท็บใหม่</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์ PDF</span>
              </button>
            </div>

            {/* Optional Embedded Viewer fallback button */}
            {blobUrl && (
              <div className="pt-2 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setUseIframeFallback(true);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-teal-400 hover:text-teal-300 underline"
                >
                  ลองเปิดผ่านโหมดฝังเบราว์เซอร์
                </button>
              </div>
            )}
          </div>
        )}

        {useIframeFallback && blobUrl && (
          <div className="w-full h-[68vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            <iframe
              src={blobUrl}
              title={file.name}
              className="w-full h-full border-0"
            />
          </div>
        )}

        {!isLoading && !errorMessage && !useIframeFallback && (
          <div className="transition-all duration-150 inline-block shadow-2xl rounded-lg bg-white overflow-hidden border border-slate-700 my-auto">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2 bg-slate-950 text-slate-400 text-[11px] flex items-center justify-between border-t border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate text-slate-300 font-medium">{file.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span>รองรับการแสดงผลความละเอียดสูง (Canvas HD)</span>
        </div>
      </div>
    </div>
  );
};

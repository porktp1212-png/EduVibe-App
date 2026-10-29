import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Printer,
  Layers,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { dataUrlToBlob, downloadOrOpenFile } from '../../lib/fileUpload';
import { getFileFromCloud } from '../../services/cloudStorageService';

// Initialize PDF.js worker safely
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
    fileId?: string;
    size?: number;
    type?: string;
  };
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
  const [resolvedData, setResolvedData] = useState<string | null>(file.data || null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(!file.data);
  const [dataError, setDataError] = useState<string | null>(null);

  // View Mode: 'native' (default, ultra-reliable & crisp) or 'canvas' (PDF.js page-by-page)
  const [viewMode, setViewMode] = useState<'native' | 'canvas'>('native');

  // Canvas Mode state
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isCanvasLoading, setIsCanvasLoading] = useState<boolean>(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. Resolve file data from cloud if missing (Real-time cross-device sync)
  useEffect(() => {
    let isCancelled = false;

    if (file.data && file.data.startsWith('data:')) {
      setResolvedData(file.data);
      setIsLoadingData(false);
      setDataError(null);
      return;
    }

    setIsLoadingData(true);
    setDataError(null);

    getFileFromCloud(file)
      .then((res) => {
        if (isCancelled) return;
        if (res && res.data) {
          setResolvedData(res.data);
          setIsLoadingData(false);
        } else if (file.url) {
          // If couldn't get base64 but have url, try fetch
          fetch(file.url)
            .then((resp) => resp.blob())
            .then((blob) => {
              if (isCancelled) return;
              const r = new FileReader();
              r.onload = () => {
                if (!isCancelled) {
                  setResolvedData(r.result as string);
                  setIsLoadingData(false);
                }
              };
              r.readAsDataURL(blob);
            })
            .catch(() => {
              if (!isCancelled) {
                setDataError('ไม่พบข้อมูลเนื้อหาไฟล์ PDF ในระบบ กรุณาตรวจสอบการเชื่อมต่อ');
                setIsLoadingData(false);
              }
            });
        } else {
          setDataError('ไม่พบข้อมูลเนื้อหาไฟล์ PDF ในระบบ กรุณาตรวจสอบการเชื่อมต่อ');
          setIsLoadingData(false);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Error resolving PDF data:', err);
        setDataError('เกิดข้อผิดพลาดในการโหลดไฟล์ PDF ข้ามเครื่อง');
        setIsLoadingData(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [file.data, file.url, file.fileId, (file as any).id]);

  // 2. Generate reliable same-origin Blob URL from resolved data
  useEffect(() => {
    if (!resolvedData) {
      setBlobUrl(null);
      return;
    }

    let activeUrl: string | null = null;
    try {
      let blob: Blob;
      if (resolvedData.startsWith('data:')) {
        blob = dataUrlToBlob(resolvedData, 'application/pdf');
      } else {
        // Raw base64 string
        const cleanB64 = resolvedData.includes(';base64,')
          ? resolvedData.substring(resolvedData.indexOf(';base64,') + 8)
          : resolvedData;
        const binaryStr = atob(cleanB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/pdf' });
      }

      activeUrl = URL.createObjectURL(blob);
      setBlobUrl(activeUrl);
    } catch (err) {
      console.warn('Error creating PDF blob URL:', err);
    }

    return () => {
      if (activeUrl) {
        try {
          URL.revokeObjectURL(activeUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [resolvedData]);

  // 3. Load PDF.js document when in Canvas mode
  const loadPdfDocument = useCallback(async () => {
    if (!resolvedData && !blobUrl) return;

    setIsCanvasLoading(true);
    setCanvasError(null);

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

      if (resolvedData) {
        const cleanB64 = resolvedData.includes(';base64,')
          ? resolvedData.substring(resolvedData.indexOf(';base64,') + 8)
          : resolvedData;
        const binaryStr = atob(cleanB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });
      } else if (blobUrl) {
        loadingTask = pdfjsLib.getDocument({
          url: blobUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });
      }

      if (!loadingTask) {
        throw new Error('ไม่สามารถเตรียมการโหลด PDF ได้');
      }

      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setIsCanvasLoading(false);
    } catch (err: any) {
      console.warn('PDF.js render notice, switching to native browser view:', err);
      setCanvasError('แคนวาสไม่สามารถประมวลผลได้ สลับไปยังโหมดเบราว์เซอร์');
      setIsCanvasLoading(false);
      setViewMode('native');
    }
  }, [resolvedData, blobUrl]);

  useEffect(() => {
    if (viewMode === 'canvas') {
      loadPdfDocument();
    }
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
  }, [viewMode, loadPdfDocument]);

  // 4. Render current page to canvas
  useEffect(() => {
    if (viewMode !== 'canvas' || !pdfDocRef.current || !canvasRef.current || isCanvasLoading) return;

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
  }, [viewMode, currentPage, scale, rotation, isCanvasLoading]);

  const handleDownload = () => {
    if (blobUrl) {
      downloadOrOpenFile(blobUrl, file.name, true);
    } else if (resolvedData) {
      downloadOrOpenFile(resolvedData, file.name, true);
    } else {
      downloadOrOpenFile(file.url, file.name, true);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      downloadOrOpenFile(blobUrl, file.name, false);
    } else if (resolvedData) {
      downloadOrOpenFile(resolvedData, file.name, false);
    } else {
      downloadOrOpenFile(file.url, file.name, false);
    }
  };

  const handlePrint = () => {
    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch {
            // ignore
          }
        }, 800);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Toolbar */}
      <div className="px-4 py-3 bg-slate-950/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold truncate text-slate-100 max-w-[180px] sm:max-w-xs md:max-w-md" title={file.name}>
            {file.name}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('native')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'native'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="โหมดเบราว์เซอร์อัตโนมัติ (แนะนำ คมชัดและโหลดเร็วที่สุด)"
            >
              โหมดเบราว์เซอร์
            </button>
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="โหมดแคนวาสแยกตามหน้า (Canvas HD)"
            >
              โหมดแคนวาส
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenNewTab}
            disabled={!blobUrl && !resolvedData}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-40"
            title="เปิดดูในแท็บใหม่แบบเต็มจอ"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เปิดในแท็บใหม่</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!blobUrl}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="พิมพ์เอกสาร PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!blobUrl && !resolvedData && !file.url}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="ดาวน์โหลดไฟล์ PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดาวน์โหลด</span>
          </button>
        </div>
      </div>

      {/* Canvas Controls Toolbar (Only active when in Canvas mode) */}
      {viewMode === 'canvas' && numPages > 0 && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isCanvasLoading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold px-2 text-slate-300">
              หน้า {currentPage} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages || isCanvasLoading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              disabled={scale <= 0.6 || isCanvasLoading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="ย่อ (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-medium px-1 text-slate-300 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
              disabled={scale >= 3.0 || isCanvasLoading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="ขยาย (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="หมุน 90 องศา"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="grow overflow-auto p-2 sm:p-4 bg-slate-950 flex items-center justify-center min-h-[440px] max-h-[76vh]"
      >
        {/* Loading State */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
            <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
            <p className="text-sm font-semibold text-white">กำลังซิงค์และโหลดเนื้อหาไฟล์ PDF จากคลาวด์...</p>
            <p className="text-xs text-slate-400">ดึงข้อมูลแบบเรียลไทม์เพื่อเปิดดูได้ทันทีข้ามอุปกรณ์</p>
          </div>
        )}

        {/* Error State */}
        {dataError && !isLoadingData && (
          <div className="max-w-md w-full p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">ไม่สามารถดึงข้อมูลไฟล์ PDF ได้</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{dataError}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ลองเปิดผ่านแท็บใหม่</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Native High-Performance Browser Engine (Recommended default) */}
        {!isLoadingData && !dataError && viewMode === 'native' && blobUrl && (
          <div className="w-full h-[72vh] rounded-xl overflow-hidden bg-white shadow-2xl border border-slate-800">
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full h-full rounded-xl"
            >
              <iframe
                src={blobUrl}
                title={file.name}
                className="w-full h-full border-0 rounded-xl"
              >
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-700">เบราว์เซอร์นี้จำกัดการแสดงผลตัวอย่าง PDF ฝังในหน้าเว็บ</p>
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                  >
                    คลิกเปิดดูในแท็บใหม่ทันที
                  </button>
                </div>
              </iframe>
            </object>
          </div>
        )}

        {/* 2. Canvas HD PDF.js page-by-page rendering */}
        {!isLoadingData && !dataError && viewMode === 'canvas' && (
          <div className="w-full flex items-center justify-center">
            {isCanvasLoading && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                <p className="text-xs font-medium">กำลังวาดหน้าเอกสารแคนวาส...</p>
              </div>
            )}
            <div className={`transition-all inline-block shadow-2xl rounded-lg bg-white overflow-hidden border border-slate-700 my-auto ${isCanvasLoading ? 'hidden' : 'block'}`}>
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
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
          <span className="text-emerald-400 font-medium">✓ ซิงค์คลาวด์เรียลไทม์ พร้อมเปิดดูได้ทันที</span>
        </div>
      </div>
    </div>
  );
};

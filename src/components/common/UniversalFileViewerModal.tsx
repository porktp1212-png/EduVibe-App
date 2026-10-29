import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Music,
  Video,
  File,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatFileSize, getFileCategory, downloadOrOpenFile } from '../../lib/fileUpload';
import { getFileFromCloud } from '../../services/cloudStorageService';
import { PdfViewer } from './PdfViewer';

interface UniversalFileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    url?: string;
    data?: string;
    fileId?: string;
    id?: string;
    type?: string;
    size?: number;
  } | null;
}

export const UniversalFileViewerModal: React.FC<UniversalFileViewerModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [resolvedData, setResolvedData] = useState<string | null>(file?.data || null);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setResolvedData(null);
      setIsResolving(false);
      setResolveError(null);
      return;
    }

    if (file.data && file.data.startsWith('data:')) {
      setResolvedData(file.data);
      setIsResolving(false);
      setResolveError(null);
      return;
    }

    let isMounted = true;
    setIsResolving(true);
    setResolveError(null);

    getFileFromCloud(file)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          setResolvedData(res.data);
        } else if (file.url) {
          // Fallback to url
          setResolvedData(file.url);
        } else {
          setResolveError('ไม่พบข้อมูลไฟล์ในระบบคลาวด์');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error resolving cloud file:', err);
        setResolveError('เกิดข้อผิดพลาดในการโหลดไฟล์');
      })
      .finally(() => {
        if (isMounted) setIsResolving(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file?.name, file?.data, file?.url, (file as any)?.fileId, (file as any)?.id]);

  if (!isOpen || !file) return null;

  const fileSrc = resolvedData || file.data || file.url || '';
  const category = getFileCategory(file.name, file.type);
  const isImage = category === 'image';
  const isPdf = category === 'pdf';
  const isVideo = category === 'video';
  const isAudio = category === 'audio';

  const handleDownload = () => {
    downloadOrOpenFile(fileSrc, file.name, true);
  };

  const handleOpenNewTab = () => {
    downloadOrOpenFile(fileSrc, file.name, false);
  };

  const renderIcon = () => {
    switch (category) {
      case 'pdf':
        return <FileText className="w-16 h-16 text-rose-500" />;
      case 'word':
        return <FileText className="w-16 h-16 text-blue-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-16 h-16 text-emerald-600" />;
      case 'powerpoint':
        return <Presentation className="w-16 h-16 text-amber-600" />;
      case 'archive':
        return <Archive className="w-16 h-16 text-purple-600" />;
      case 'audio':
        return <Music className="w-16 h-16 text-pink-600" />;
      case 'video':
        return <Video className="w-16 h-16 text-indigo-600" />;
      default:
        return <File className="w-16 h-16 text-slate-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full ${isPdf ? 'max-w-5xl' : 'max-w-4xl'} max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <File className="w-4 h-4 text-slate-200" />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold truncate text-white" title={file.name}>
                {file.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {formatFileSize(file.size)} • {file.type || 'ไฟล์แนบ'}
                {isResolving && <span className="ml-2 text-teal-400 font-semibold">• ซิงค์จากคลาวด์...</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileSrc && (
              <>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="ดาวน์โหลดไฟล์"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className={`grow overflow-auto ${isPdf ? 'p-2 sm:p-4 bg-slate-950' : 'p-4 sm:p-6 bg-slate-100'} flex items-center justify-center min-h-[360px]`}>
          {isResolving && !fileSrc ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
              <p className="text-sm font-semibold text-slate-800">กำลังเชื่อมต่อและโหลดไฟล์ผลงาน...</p>
              <p className="text-xs text-slate-500">ซิงค์ไฟล์จากฐานข้อมูลคลาวด์เพื่อให้เปิดดูได้ทันทีข้ามอุปกรณ์</p>
            </div>
          ) : isImage && fileSrc ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileSrc}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-300 bg-white"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[76vh]">
              <PdfViewer
                file={{
                  ...file,
                  data: fileSrc.startsWith('data:') ? fileSrc : file.data,
                  url: fileSrc.startsWith('data:') ? undefined : fileSrc,
                }}
              />
            </div>
          ) : isVideo && fileSrc ? (
            <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-xl">
              <video
                src={fileSrc}
                controls
                autoPlay
                className="w-full max-h-[65vh] object-contain"
              >
                เบราว์เซอร์ไม่รองรับการเล่นวิดีโอโดยตรง
              </video>
            </div>
          ) : isAudio && fileSrc ? (
            <div className="p-8 bg-white rounded-2xl shadow-md border border-slate-200 text-center space-y-4 max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 truncate">{file.name}</h4>
              <audio src={fileSrc} controls className="w-full mt-2" />
            </div>
          ) : (
            /* Document / Office / Other File Format Presentation */
            <div className="p-8 sm:p-10 bg-white rounded-3xl shadow-xl border border-slate-200 text-center max-w-md w-full space-y-4">
              <div className="flex justify-center">{renderIcon()}</div>
              <div>
                <h4 className="font-bold text-base text-slate-900 truncate" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  ประเภท: {file.type || category} • ขนาด: {formatFileSize(file.size)}
                </p>
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  ไฟล์เอกสารประเภทนี้สามารถเปิดด้วยโปรแกรมเฉพาะทางบนเครื่อง หรือดาวน์โหลดเพื่อเปิดได้ทันที
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                {fileSrc && (
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดดูในแท็บใหม่</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>ระบบซิงค์ไฟล์เรียลไทม์ (Cloud Sync Ready)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

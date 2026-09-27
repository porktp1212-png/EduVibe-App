import React from 'react';
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
} from 'lucide-react';
import { formatFileSize, getFileCategory, downloadOrOpenFile } from '../../lib/fileUpload';
import { PdfViewer } from './PdfViewer';

interface UniversalFileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    url?: string;
    data?: string;
    type?: string;
    size?: number;
  } | null;
}

export const UniversalFileViewerModal: React.FC<UniversalFileViewerModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  if (!isOpen || !file) return null;

  const fileSrc = file.data || file.url || '';
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
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileSrc && (
              <>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors ml-1"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className={`grow overflow-auto ${isPdf ? 'p-2 sm:p-4 bg-slate-950' : 'p-4 sm:p-6 bg-slate-100'} flex items-center justify-center min-h-[360px]`}>
          {isImage && fileSrc ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileSrc}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-300 bg-white"
              />
            </div>
          ) : isPdf && fileSrc ? (
            <div className="w-full h-[76vh]">
              <PdfViewer file={file} />
            </div>
          ) : isVideo && fileSrc ? (
            <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-xl">
              <video
                src={fileSrc}
                controls
                autoPlay
                className="w-full max-h-[65vh] object-contain"
              >
                เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอนี้
              </video>
            </div>
          ) : isAudio && fileSrc ? (
            <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-lg border border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto text-pink-600 shadow-inner">
                <Music className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 truncate">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{formatFileSize(file.size)}</p>
              </div>
              <audio src={fileSrc} controls className="w-full">
                เบราว์เซอร์ของคุณไม่รองรับการเล่นไฟล์เสียงนี้
              </audio>
            </div>
          ) : (
            /* Document, Archive, Spreadsheet, Presentation, or unknown */
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-5">
              <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto shadow-inner">
                {renderIcon()}
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 break-words px-2">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-1.5">
                  ขนาดไฟล์ {formatFileSize(file.size)} • ชนิดไฟล์: {file.type || 'เอกสาร'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left">
                <p className="font-medium text-slate-800">คำแนะนำในการเปิดดู:</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  ไฟล์ชนิดนี้สามารถดาวน์โหลดเพื่อเปิดดูด้วยโปรแกรมบนคอมพิวเตอร์ หรือเปิดผ่านแท็บใหม่เพื่อดูด้วยแอปพลิเคชันที่รองรับ
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์นี้</span>
                </button>
                {fileSrc && (
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิดในแท็บใหม่</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

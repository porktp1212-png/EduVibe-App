import React, { useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Music,
  Video,
  File,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { AttachedFile } from '../../types';
import { formatFileSize, getFileCategory, downloadOrOpenFile } from '../../lib/fileUpload';
import { prefetchFilesForList } from '../../services/cloudStorageService';

interface FileListDisplayProps {
  files: AttachedFile[];
  onRemove?: (index: number) => void;
  onPreview?: (file: AttachedFile) => void;
  readOnly?: boolean;
}

export const FileListDisplay: React.FC<FileListDisplayProps> = ({
  files,
  onRemove,
  onPreview,
  readOnly = false,
}) => {
  // Proactively prefetch files in background so clicking opens them in 0ms ("คลิกปุ้บเปิดได้เลย")
  useEffect(() => {
    if (files && files.length > 0) {
      prefetchFilesForList(files);
    }
  }, [files]);

  if (!files || files.length === 0) return null;

  const renderFileIcon = (file: AttachedFile) => {
    const category = getFileCategory(file.name, file.type);
    const fileSrc = file.url || file.data;

    if (category === 'image' && fileSrc) {
      return (
        <img
          src={fileSrc}
          alt={file.name}
          className="w-10 h-10 object-cover rounded-lg border border-teal-200 shrink-0 bg-white"
        />
      );
    }

    switch (category) {
      case 'pdf':
        return (
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'word':
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'excel':
        return (
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        );
      case 'powerpoint':
        return (
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Presentation className="w-5 h-5" />
          </div>
        );
      case 'archive':
        return (
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
            <Archive className="w-5 h-5" />
          </div>
        );
      case 'audio':
        return (
          <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 border border-pink-200">
            <Music className="w-5 h-5" />
          </div>
        );
      case 'video':
        return (
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
            <Video className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
            <File className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {files.map((file, idx) => {
        const fileSrc = file.url || file.data;
        const isUploading = file.uploadStatus === 'uploading';
        const isError = file.uploadStatus === 'error';

        return (
          <div
            key={idx}
            onClick={() => {
              if (!isUploading && onPreview) {
                onPreview(file);
              }
            }}
            className={`group flex items-center justify-between p-3 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all gap-3 shadow-2xs ${
              onPreview && !isUploading ? 'cursor-pointer' : ''
            }`}
            title={onPreview && !isUploading ? 'คลิกที่นี่เพื่อเปิดดูไฟล์นี้ทันที' : undefined}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
              {renderFileIcon(file)}
              <div className="overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-teal-900 truncate" title={file.name}>
                    {file.name}
                  </span>
                  {isUploading && (
                    <span className="text-[10px] text-teal-600 font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> กำลังอัปโหลด...
                    </span>
                  )}
                  {isError && (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> ขัดข้อง
                    </span>
                  )}
                  {!isUploading && !isError && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>พร้อมเปิดดู</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span className="truncate">{file.type || 'ไฟล์แนบ'}</span>
                  {onPreview && !isUploading && (
                    <>
                      <span>•</span>
                      <span className="text-teal-600 font-medium hidden sm:inline">คลิกเพื่อเปิดดู</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {onPreview && !isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(file);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-teal-800 bg-teal-100/90 hover:bg-teal-200 border border-teal-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="เปิดดูไฟล์ผลงานนี้ทันที"
                >
                  <Eye className="w-3.5 h-3.5 text-teal-700" />
                  <span>เปิดดูทันที</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadOrOpenFile(fileSrc, file.name, true);
                }}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="ดาวน์โหลดไฟล์ลงเครื่อง"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden md:inline">ดาวน์โหลด</span>
              </button>

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(idx);
                  }}
                  className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="ลบไฟล์นี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

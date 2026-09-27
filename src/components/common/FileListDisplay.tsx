import React from 'react';
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
} from 'lucide-react';
import type { AttachedFile } from '../../types';
import { formatFileSize, getFileCategory, downloadOrOpenFile } from '../../lib/fileUpload';

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
  if (!files || files.length === 0) return null;

  const renderFileIcon = (file: AttachedFile) => {
    const category = getFileCategory(file.name, file.type);
    const fileSrc = file.url || file.data;

    if (category === 'image' && fileSrc) {
      return (
        <img
          src={fileSrc}
          alt={file.name}
          className="w-10 h-10 object-cover rounded-lg border border-teal-200 shrink-0"
        />
      );
    }

    switch (category) {
      case 'pdf':
        return (
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'word':
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'excel':
        return (
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        );
      case 'powerpoint':
        return (
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5" />
          </div>
        );
      case 'archive':
        return (
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5" />
          </div>
        );
      case 'audio':
        return (
          <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5" />
          </div>
        );
      case 'video':
        return (
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
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
            className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors gap-3"
          >
            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
              {renderFileIcon(file)}
              <div className="overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
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
                  {!isUploading && !isError && file.uploadStatus === 'ready' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span className="truncate">{file.type || 'ไฟล์แนบ'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {fileSrc && onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(file)}
                  className="p-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors text-xs font-medium flex items-center gap-1"
                  title="ดูตัวอย่างไฟล์"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดูตัวอย่าง</span>
                </button>
              )}

              {fileSrc && (
                <button
                  type="button"
                  onClick={() => downloadOrOpenFile(fileSrc, file.name, true)}
                  className="p-1.5 rounded-lg text-slate-700 bg-white hover:bg-slate-200 border border-slate-200 transition-colors text-xs font-medium flex items-center gap-1"
                  title="ดาวน์โหลดไฟล์"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                </button>
              )}

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
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

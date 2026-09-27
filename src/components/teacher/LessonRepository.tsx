import React, { useState, useRef } from 'react';
import type { Classroom, Lesson, AttachedFile } from '../../types';
import { saveLesson, deleteLesson } from '../../services/firestoreService';
import { processSingleFile } from '../../lib/fileUpload';
import { FileListDisplay } from '../common/FileListDisplay';
import { UniversalFileViewerModal } from '../common/UniversalFileViewerModal';
import {
  BookOpen,
  PlusCircle,
  Video,
  FileText,
  Presentation,
  Link as LinkIcon,
  Search,
  ExternalLink,
  Trash2,
  FolderOpen,
  Paperclip,
  Upload,
  FileSpreadsheet,
  FileCode,
  Headphones,
  Image as ImageIcon,
  Archive,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LessonRepositoryProps {
  classroom: Classroom | null;
  lessons: Lesson[];
  isTeacher: boolean;
}

type MediaTypeFilter = 'all' | 'pdf' | 'video' | 'slide' | 'doc' | 'sheet' | 'image' | 'audio' | 'link';

export const LessonRepository: React.FC<LessonRepositoryProps> = ({
  classroom,
  lessons,
  isTeacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('หน่วยการเรียนรู้ที่ 1');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<Lesson['mediaType']>('pdf');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deletion modal
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // File Preview Modal
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique units
  const units = Array.from(new Set(lessons.map((l) => l.unit || 'เนื้อหาทั่วไป')));

  const filteredLessons = lessons.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = selectedUnit === 'all' || (l.unit || 'เนื้อหาทั่วไป') === selectedUnit;
    const matchesType =
      typeFilter === 'all' ||
      l.mediaType === typeFilter ||
      (typeFilter === 'pdf' && l.files?.some((f) => f.type?.includes('pdf') || f.name.endsWith('.pdf'))) ||
      (typeFilter === 'image' && l.files?.some((f) => f.type?.startsWith('image/'))) ||
      (typeFilter === 'slide' && l.files?.some((f) => f.name.match(/\.(ppt|pptx)$/i))) ||
      (typeFilter === 'doc' && l.files?.some((f) => f.name.match(/\.(doc|docx)$/i))) ||
      (typeFilter === 'sheet' && l.files?.some((f) => f.name.match(/\.(xls|xlsx|csv)$/i)));
    return matchesSearch && matchesUnit && matchesType;
  });

  const handleFileSelection = async (selectedFileList: FileList | null) => {
    if (!selectedFileList || selectedFileList.length === 0) return;
    setIsUploadingFiles(true);
    setUploadError(null);

    const newAttachments: AttachedFile[] = [];

    for (let i = 0; i < selectedFileList.length; i++) {
      const file = selectedFileList[i];
      try {
        const attached = await processSingleFile(file);
        newAttachments.push(attached);
      } catch (err: any) {
        console.error('File process failed:', err);
        setUploadError(`ไม่สามารถประมวลผลไฟล์ ${file.name} ได้: ${err.message || ''}`);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    setIsUploadingFiles(false);
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !classroom) return;

    setIsSaving(true);
    try {
      const primaryFile = attachedFiles[0];

      const newLesson: Lesson = {
        id: `les_${Date.now()}`,
        classroomId: classroom.id,
        title: title.trim(),
        unit: unit.trim() || 'เนื้อหาทั่วไป',
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || primaryFile?.url || undefined,
        mediaType,
        fileName: primaryFile?.name,
        fileSize: primaryFile?.size,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
        createdAt: new Date().toISOString(),
      };

      await saveLesson(newLesson);
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setMediaUrl('');
      setAttachedFiles([]);
      setUploadError(null);
    } catch (err) {
      console.error('Error saving lesson:', err);
      setUploadError('เกิดข้อผิดพลาดในการบันทึกบทเรียน');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    setIsDeletingLesson(true);
    try {
      await deleteLesson(lessonToDelete.id);
      setLessonToDelete(null);
    } catch (err) {
      console.error('Error deleting lesson:', err);
    } finally {
      setIsDeletingLesson(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับคลังบทเรียน</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาสร้างหรือเลือกห้องเรียน เพื่อเข้าถึงหรืออัปโหลดเอกสารและสื่อการสอน
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">คลังบทเรียนและสื่อการสอน</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์รวมเอกสาร PDF สไลด์นำเสนอ วิดีโอ ใบงาน และสื่อการสอนทุกรูปแบบ
          </p>
        </div>

        {isTeacher && (
          <button
            type="button"
            id="btn-open-create-lesson"
            onClick={() => {
              setShowCreateModal(true);
              setAttachedFiles([]);
              setUploadError(null);
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มสื่อการสอน / บทเรียน</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative grow w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อบทเรียน เอกสาร หรือคำสำคัญ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
            />
          </div>

          {units.length > 0 && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
            >
              <option value="all">ทุกหน่วยการเรียนรู้ ({lessons.length})</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Media Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> ประเภทสื่อ:
          </span>
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'pdf', label: 'เอกสาร PDF' },
            { id: 'slide', label: 'สไลด์นำเสนอ' },
            { id: 'video', label: 'วิดีโอ' },
            { id: 'doc', label: 'ไฟล์ Word' },
            { id: 'sheet', label: 'สเปรดชีต Excel' },
            { id: 'image', label: 'รูปภาพ / ผังมโนทัศน์' },
            { id: 'audio', label: 'ไฟล์เสียง' },
            { id: 'link', label: 'ลิงก์ภายนอก' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.id as MediaTypeFilter)}
              className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer text-[11px] ${
                typeFilter === chip.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lessons Grid */}
      {filteredLessons.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">ไม่พบบทเรียนในคลัง</h3>
          <p className="text-xs text-slate-500">
            {isTeacher
              ? 'คุณครูสามารถคลิกปุ่ม "เพิ่มสื่อการสอน / บทเรียน" เพื่ออัปโหลดเอกสารหรือสื่อใหม่'
              : 'ยังไม่มีบทเรียนในหัวข้อนี้'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLessons.map((lesson) => {
            const isVideo = lesson.mediaType === 'video';
            const isYoutube = isVideo && lesson.mediaUrl?.includes('youtube.com/watch?v=');
            const youtubeId = isYoutube ? lesson.mediaUrl?.split('v=')[1]?.split('&')[0] : null;

            // Collect all files
            const lessonFiles: AttachedFile[] =
              lesson.files && Array.isArray(lesson.files) && lesson.files.length > 0
                ? lesson.files
                : lesson.fileName
                ? [
                    {
                      name: lesson.fileName,
                      type: lesson.mediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                      size: lesson.fileSize || 0,
                      url: lesson.mediaUrl,
                    },
                  ]
                : [];

            return (
              <div
                key={lesson.id}
                id={`lesson-card-${lesson.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* YouTube Embed Player */}
                  {youtubeId && (
                    <div className="aspect-video w-full bg-slate-900 overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title={lesson.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                        {lesson.unit || 'เนื้อหาทั่วไป'}
                      </span>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => setLessonToDelete(lesson)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="ลบบทเรียน"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{lesson.title}</h3>
                    {lesson.content && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {lesson.content}
                      </p>
                    )}

                    {/* Attached files render */}
                    {lessonFiles.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                          <span>เอกสารและสื่อแนบ ({lessonFiles.length} รายการ):</span>
                        </div>
                        <FileListDisplay
                          files={lessonFiles}
                          onPreview={(file) => setViewingFile(file)}
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* External Media Link Button */}
                {lesson.mediaUrl && !youtubeId && lessonFiles.length === 0 && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <a
                      href={lesson.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white hover:bg-slate-100 text-teal-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดเอกสาร / สื่อการสอนฉบับเต็ม</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lesson Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-teal-600 p-5 text-white flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <span>เพิ่มสื่อหรือบทเรียนใหม่ทุกรูปแบบ</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อบทเรียน / หัวข้อสื่อการสอน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เอกสารประกอบการเรียน บทที่ 3: ระบบนิเวศและความหลากหลาย"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  หน่วยการเรียนรู้ (Unit)
                </label>
                <input
                  type="text"
                  placeholder="เช่น หน่วยการเรียนรู้ที่ 1: ชีววิทยาพื้นฐาน"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เนื้อหาบทเรียน สรุป หรือคำแนะนำประกอบสื่อ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="เขียนสรุปเนื้อหาสำคัญ วัตถุประสงค์ หรือคำแนะนำในการศึกษา..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Media Type & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ประเภทสื่อการสอนหลัก
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pdf">📄 เอกสาร PDF / ใบความรู้</option>
                    <option value="slide">📊 สไลด์บรรยาย (PowerPoint / Google Slides)</option>
                    <option value="video">🎬 วิดีโอ (YouTube / MP4)</option>
                    <option value="doc">📝 เอกสาร Word / บันทึกการสอน</option>
                    <option value="sheet">📈 สเปรดชีต Excel / ตารางข้อมูล</option>
                    <option value="image">🖼️ รูปภาพ / อินโฟกราฟิก / แผนภาพ</option>
                    <option value="audio">🎧 ไฟล์เสียงบรรยาย / Podcast</option>
                    <option value="archive">📦 ไฟล์บีบอัด ZIP / ชุดสื่อรวม</option>
                    <option value="link">🌐 ลิงก์เว็บไซต์ / แหล่งค้นคว้า</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    URL สื่อออนไลน์ภายนอก (ถ้ามี)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/... หรือ Canva/Drive"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Direct Multi-File Upload Section */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-teal-600" />
                    <span>แนบไฟล์สื่อการสอนจากอุปกรณ์ (แนบได้หลายไฟล์)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFiles}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelection(e.target.files)}
                  className="hidden"
                />

                <p className="text-[11px] text-slate-500">
                  รองรับทุกไฟล์: PDF, Word, PowerPoint, Excel, ภาพถ่าย (JPG/PNG), วิดีโอ, เสียง, ZIP ฯลฯ
                </p>

                {isUploadingFiles && (
                  <div className="p-3 bg-teal-50 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                    <span>กำลังประมวลผลและอัปโหลดไฟล์สื่อ...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Attached Files List Display with Remove button */}
                {attachedFiles.length > 0 && (
                  <div className="pt-2">
                    <FileListDisplay
                      files={attachedFiles}
                      onRemove={(idx) => handleRemoveAttachedFile(idx)}
                      onPreview={(f) => setViewingFile(f)}
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-save-lesson-submit"
                  disabled={isSaving || isUploadingFiles}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกเข้าคลังสื่อการสอน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Lesson Confirmation Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบบทเรียน?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                ต้องการลบ <strong className="text-slate-800">"{lessonToDelete.title}"</strong> ออกจากคลังสื่อการสอนหรือไม่?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingLesson}
                onClick={() => setLessonToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingLesson}
                onClick={confirmDeleteLesson}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingLesson ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal File Viewer Modal */}
      <UniversalFileViewerModal
        isOpen={Boolean(viewingFile)}
        onClose={() => setViewingFile(null)}
        file={viewingFile}
      />
    </div>
  );
};

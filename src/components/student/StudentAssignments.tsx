import React, { useState, useRef } from 'react';
import type { Classroom, Assignment, Submission, UserProfile, AttachedFile } from '../../types';
import { submitHomework } from '../../services/firestoreService';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  Send,
  ExternalLink,
  MessageSquare,
  Award,
  File,
  Image,
  Paperclip,
  Trash2,
  Eye,
  CheckSquare,
  Download,
  Plus,
  Loader2,
  History,
  Search,
  FolderArchive,
  X,
} from 'lucide-react';
import { processSingleFile, formatFileSize, downloadOrOpenFile } from '../../lib/fileUpload';
import { FileListDisplay } from '../common/FileListDisplay';
import { UniversalFileViewerModal } from '../common/UniversalFileViewerModal';

interface StudentAssignmentsProps {
  classroom: Classroom | null;
  assignments: Assignment[];
  submissions: Submission[];
  student: UserProfile;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  classroom,
  assignments,
  submissions,
  student,
}) => {
  const [selectedAsg, setSelectedAsg] = useState<Assignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  const [tab, setTab] = useState<'pending' | 'submitted' | 'graded' | 'history'>('pending');
  const [historySearch, setHistorySearch] = useState('');
  const [reviewHistoryItem, setReviewHistoryItem] = useState<{ asg: Assignment; sub: Submission } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const studentSubmissionsMap = new Map<string, Submission>();
  submissions
    .filter((s) => s.studentId === student.id)
    .forEach((s) => {
      studentSubmissionsMap.set(s.assignmentId, s);
    });

  const pendingAssignments = assignments.filter((a) => !studentSubmissionsMap.has(a.id));
  const submittedAssignments = assignments.filter((a) => {
    const sub = studentSubmissionsMap.get(a.id);
    return sub && sub.status === 'submitted';
  });
  const gradedAssignments = assignments.filter((a) => {
    const sub = studentSubmissionsMap.get(a.id);
    return sub && sub.status === 'graded';
  });

  const getSubmissionFiles = (sub: Submission): AttachedFile[] => {
    if (sub.files && Array.isArray(sub.files) && sub.files.length > 0) {
      return sub.files;
    }
    if (sub.fileUrl || sub.fileData || sub.fileName) {
      return [
        {
          name: sub.fileName || 'ไฟล์ผลงานที่แนบไว้',
          type: sub.fileType || 'application/octet-stream',
          size: sub.fileSize || 0,
          url: sub.fileUrl,
          data: sub.fileData,
          uploadStatus: 'ready',
        },
      ];
    }
    return [];
  };

  const handleOpenSubmit = (asg: Assignment) => {
    const existing = studentSubmissionsMap.get(asg.id);
    setSelectedAsg(asg);
    setSubmitText(existing?.content || '');
    setFileUrl(existing?.fileUrl || '');

    if (existing) {
      setAttachedFiles(getSubmissionFiles(existing));
    } else {
      setAttachedFiles([]);
    }
    setFileError(null);
  };

  const handleAddFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    setIsProcessingFiles(true);

    const filesArray = Array.from(fileList);

    // Add placeholders
    const placeholders: AttachedFile[] = filesArray.map((f) => ({
      name: f.name,
      type: f.type || 'application/octet-stream',
      size: f.size,
      uploadStatus: 'uploading',
    }));

    setAttachedFiles((prev) => [...prev, ...placeholders]);

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      try {
        const processed = await processSingleFile(file);
        setAttachedFiles((prev) => {
          const next = [...prev];
          const placeholderIdx = next.findIndex(
            (p) => p.name === file.name && p.size === file.size && p.uploadStatus === 'uploading'
          );
          if (placeholderIdx !== -1) {
            next[placeholderIdx] = processed;
          } else {
            next.push(processed);
          }
          return next;
        });
      } catch (err) {
        console.warn('File process error:', err);
        setAttachedFiles((prev) => {
          const next = [...prev];
          const placeholderIdx = next.findIndex(
            (p) => p.name === file.name && p.size === file.size && p.uploadStatus === 'uploading'
          );
          if (placeholderIdx !== -1) {
            next[placeholderIdx] = {
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              uploadStatus: 'error',
              errorMessage: 'อัปโหลดไม่สำเร็จ',
            };
          }
          return next;
        });
      }
    }

    setIsProcessingFiles(false);
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAddFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsg || (!submitText.trim() && attachedFiles.length === 0 && !fileUrl.trim()) || !classroom) {
      setFileError('กรุณากรอกคำตอบ หรือแนบไฟล์ผลงานอย่างน้อย 1 รายการ');
      return;
    }

    // Check if any file is still uploading
    const stillUploading = attachedFiles.some((f) => f.uploadStatus === 'uploading');
    if (stillUploading) {
      setFileError('กรุณารอให้อัปโหลดไฟล์ให้เสร็จสมบูรณ์ก่อนส่ง');
      return;
    }

    setIsSubmitting(true);
    setFileError(null);

    try {
      const existing = studentSubmissionsMap.get(selectedAsg.id);

      // Primary file fallback for backwards compatibility
      const primaryFile = attachedFiles[0];

      const submission: Submission = {
        id: existing?.id || `sub_${selectedAsg.id}_${student.id}`,
        assignmentId: selectedAsg.id,
        classroomId: classroom.id,
        studentId: student.id,
        studentName: student.name,
        submittedAt: new Date().toISOString(),
        content: submitText.trim() || (attachedFiles.length > 0 ? `[แนบไฟล์ผลงาน ${attachedFiles.length} รายการ]` : ''),
        fileUrl: primaryFile?.url || fileUrl.trim() || undefined,
        fileName: primaryFile?.name,
        fileType: primaryFile?.type,
        fileSize: primaryFile?.size,
        fileData: primaryFile?.data,
        files: attachedFiles,
        status: 'submitted',
        score: null,
        teacherFeedback: '',
        aiFeedback: '',
        pointsAwarded: 0,
      };

      await submitHomework(submission);
      setSelectedAsg(null);
      setSubmitText('');
      setFileUrl('');
      setAttachedFiles([]);
    } catch (err) {
      console.error(err);
      setFileError('บันทึกการส่งงานขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">คุณยังไม่ได้เข้าร่วมห้องเรียน</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาเข้าร่วมห้องเรียนด้วยรหัส 6 หลักจากคุณครูผู้สอนเพื่อเริ่มดูและส่งการบ้าน
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
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">การบ้านและชิ้นงานของฉัน</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ส่งการบ้าน แนบไฟล์ผลงานได้หลายไฟล์พร้อมกัน ทั้งภาพ เอกสาร PDF รายงาน และลิงก์
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            id="btn-tab-pending"
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'pending'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            รอดำเนินการ ({pendingAssignments.length})
          </button>
          <button
            type="button"
            id="btn-tab-submitted"
            onClick={() => setTab('submitted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'submitted'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ส่งแล้ว ({submittedAssignments.length})
          </button>
          <button
            type="button"
            id="btn-tab-graded"
            onClick={() => setTab('graded')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'graded'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ตรวจแล้ว ({gradedAssignments.length})
          </button>
          <button
            type="button"
            id="btn-tab-history"
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === 'history'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-teal-800 bg-teal-50 hover:bg-teal-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>คลังผลงานย้อนหลัง ({submittedAssignments.length + gradedAssignments.length})</span>
          </button>
        </div>
      </div>

      {/* Content List by Tab */}
      <div className="space-y-4">
        {tab === 'pending' && (
          pendingAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              ไม่มีการบ้านที่ค้างส่งในขณะนี้ ยินดีด้วย! 🎉
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAssignments.map((asg) => {
                const isOverdue = new Date(asg.dueDate) < new Date();
                return (
                  <div
                    key={asg.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-colors gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                          {asg.maxScore} คะแนน
                        </span>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold ${
                            isOverdue ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>กำหนดส่ง: {new Date(asg.dueDate).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900">{asg.title}</h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                        {asg.description}
                      </p>

                      {/* Teacher Attached Files / Worksheets */}
                      {((asg.files && asg.files.length > 0) || asg.fileUrl || asg.fileName) && (
                        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-teal-600" />
                            <span>ไฟล์ใบงาน/เอกสารจากคุณครู:</span>
                          </span>
                          <FileListDisplay
                            files={
                              asg.files && asg.files.length > 0
                                ? asg.files
                                : [
                                    {
                                      name: asg.fileName || 'ไฟล์ใบงาน',
                                      type: asg.fileType || 'application/octet-stream',
                                      size: asg.fileSize || 0,
                                      url: asg.fileUrl,
                                      uploadStatus: 'ready',
                                    },
                                  ]
                            }
                            onPreview={(f) => setViewingFile(f)}
                            readOnly
                          />
                        </div>
                      )}

                      {asg.rubrics && asg.rubrics.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-[10px] text-teal-700 font-medium">
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                          <span>เกณฑ์รูบิก: {asg.rubrics.map((r) => r.title).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {asg.pointsReward ? `+${asg.pointsReward} แต้มสะสม` : ''}
                      </span>
                      <button
                        type="button"
                        id={`btn-open-submit-${asg.id}`}
                        onClick={() => handleOpenSubmit(asg)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>ส่งการบ้าน</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'submitted' && (
          submittedAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              ยังไม่มีการบ้านที่ส่งแล้วและกำลังรอตรวจ
            </div>
          ) : (
            <div className="space-y-4">
              {submittedAssignments.map((asg) => {
                const sub = studentSubmissionsMap.get(asg.id)!;
                const files = getSubmissionFiles(sub);

                return (
                  <div
                    key={asg.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                          ส่งแล้ว รอคุณครูตรวจ
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">{asg.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ส่งเมื่อ:{' '}
                          {sub.submittedAt
                            ? new Date(sub.submittedAt).toLocaleString('th-TH')
                            : 'ไม่ระบุ'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          id={`btn-view-history-${asg.id}`}
                          onClick={() => setReviewHistoryItem({ asg, sub })}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs rounded-xl border border-teal-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-teal-600" />
                          <span>เปิดดูผลงานย้อนหลัง</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSubmit(asg)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          แก้ไขการส่งงาน
                        </button>
                      </div>
                    </div>

                    {sub.content && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
                        {sub.content}
                      </div>
                    )}

                    {/* Attached files list */}
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                          <span>ไฟล์ผลงานที่แนบ ({files.length} ไฟล์):</span>
                        </div>
                        <FileListDisplay
                          files={files}
                          onPreview={(file) => setViewingFile(file)}
                          readOnly
                        />
                      </div>
                    )}

                    {sub.fileUrl && files.length === 0 && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                        <span>ลิงก์ภายนอก: </span>
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 underline font-medium hover:text-teal-800 truncate"
                        >
                          {sub.fileUrl}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'graded' && (
          gradedAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              ยังไม่มีงานที่ตรวจเสร็จสิ้น
            </div>
          ) : (
            <div className="space-y-4">
              {gradedAssignments.map((asg) => {
                const sub = studentSubmissionsMap.get(asg.id)!;
                const files = getSubmissionFiles(sub);

                return (
                  <div
                    key={asg.id}
                    className="p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/10 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ตรวจเสร็จสมบูรณ์
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">{asg.title}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          id={`btn-view-graded-history-${asg.id}`}
                          onClick={() => setReviewHistoryItem({ asg, sub })}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เปิดดูผลงานย้อนหลัง & คำแนะนำ</span>
                        </button>
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-sm">
                          {sub.score} / {asg.maxScore} คะแนน
                        </div>
                        {sub.pointsAwarded ? (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>+{sub.pointsAwarded} แต้ม</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="font-bold text-slate-800">คำตอบที่ส่ง:</div>
                      {sub.content && <p className="text-slate-600 whitespace-pre-wrap">{sub.content}</p>}

                      {/* Display all attached files */}
                      {files.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                            <span>ไฟล์ผลงานที่ส่ง ({files.length} ไฟล์):</span>
                          </div>
                          <FileListDisplay
                            files={files}
                            onPreview={(file) => setViewingFile(file)}
                            readOnly
                          />
                        </div>
                      )}
                    </div>

                    {/* Rubric scores breakdown */}
                    {sub.rubricScores && sub.rubricScores.length > 0 && (
                      <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ผลการประเมินแยกตามเกณฑ์รูบิก:</span>
                        </div>
                        <div className="space-y-1.5">
                          {sub.rubricScores.map((rubric, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{rubric.title}</span>
                                {rubric.comment && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{rubric.comment}</p>
                                )}
                              </div>
                              <span className="shrink-0 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md self-start sm:self-center">
                                {rubric.score} / {rubric.maxScore} คะแนน
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback from teacher & AI */}
                    {sub.teacherFeedback && (
                      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-blue-900 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>ข้อเสนอแนะจากคุณครู:</span>
                        </div>
                        <p className="text-blue-950 leading-relaxed">{sub.teacherFeedback}</p>
                      </div>
                    )}

                    {sub.aiFeedback && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>คำแนะนำจาก AI ผู้ช่วยการเรียนรู้:</span>
                        </div>
                        <p className="text-purple-950 leading-relaxed">{sub.aiFeedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อการบ้าน หรือชิ้นงานที่เคยส่งย้อนหลัง..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="text-xs text-slate-500 shrink-0 font-medium">
                ประวัติผลงานทั้งหมด {submittedAssignments.length + gradedAssignments.length} ชิ้นงาน
              </div>
            </div>

            {/* List */}
            {(() => {
              const allSubmissions = assignments
                .filter((a) => studentSubmissionsMap.has(a.id))
                .filter((a) => {
                  if (!historySearch.trim()) return true;
                  const q = historySearch.toLowerCase();
                  return (
                    a.title.toLowerCase().includes(q) ||
                    (a.description && a.description.toLowerCase().includes(q))
                  );
                });

              if (allSubmissions.length === 0) {
                return (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                    <FolderArchive className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">ไม่พบประวัติผลงานที่ค้นหา</p>
                    <p className="text-slate-400">การบ้านและชิ้นงานที่คุณเคยส่งจะถูกเก็บไว้ที่นี่เพื่อเปิดดูย้อนหลังได้ตลอดเวลา</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {allSubmissions.map((asg) => {
                    const sub = studentSubmissionsMap.get(asg.id)!;
                    const files = getSubmissionFiles(sub);
                    const isGraded = sub.status === 'graded';

                    return (
                      <div
                        key={asg.id}
                        className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                isGraded
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {isGraded ? 'ตรวจแล้ว' : 'ส่งแล้ว รอตรวจ'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ส่งเมื่อ: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('th-TH') : 'บันทึกแล้ว'}
                            </span>
                            {files.length > 0 && (
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {files.length} ไฟล์แนบ
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-sm text-slate-900">{asg.title}</h3>
                          {sub.content && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg">
                              {sub.content}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isGraded ? (
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 block">
                                {sub.score} / {asg.maxScore} คะแนน
                              </span>
                              {sub.pointsAwarded ? (
                                <span className="text-[10px] font-bold text-amber-600 mt-1 block">
                                  +{sub.pointsAwarded} แต้มสะสม
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                              คะแนนเต็ม {asg.maxScore}
                            </span>
                          )}

                          <button
                            type="button"
                            id={`btn-open-archive-${asg.id}`}
                            onClick={() => setReviewHistoryItem({ asg, sub })}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>เปิดดูผลงานย้อนหลัง</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Submit Homework Modal */}
      {selectedAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-teal-600 p-5 text-white flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Send className="w-5 h-5" />
                <span>ส่งการบ้าน: {selectedAsg.title}</span>
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAsg(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-2">
                <div>
                  <strong className="text-slate-800 block mb-0.5">คำชี้แจงโจทย์:</strong>
                  {selectedAsg.description}
                </div>

                {selectedAsg.rubrics && selectedAsg.rubrics.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                      เกณฑ์รูบิกสกอร์ที่คุณครูกำหนดไว้:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {selectedAsg.rubrics.map((r) => (
                        <div key={r.id} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px]">
                          <span className="font-bold text-slate-800">{r.title}</span>
                          <span className="text-teal-700 font-semibold block">({r.maxScore} คะแนน)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher attached worksheet/files */}
                {((selectedAsg.files && selectedAsg.files.length > 0) || selectedAsg.fileUrl || selectedAsg.fileName) && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                      <span>ไฟล์ใบงานและเอกสารที่คุณครูแนบมา:</span>
                    </span>
                    <FileListDisplay
                      files={
                        selectedAsg.files && selectedAsg.files.length > 0
                          ? selectedAsg.files
                          : [
                              {
                                name: selectedAsg.fileName || 'ไฟล์ใบงาน',
                                type: selectedAsg.fileType || 'application/octet-stream',
                                size: selectedAsg.fileSize || 0,
                                url: selectedAsg.fileUrl,
                                uploadStatus: 'ready',
                              },
                            ]
                      }
                      onPreview={(f) => setViewingFile(f)}
                      readOnly
                    />
                  </div>
                )}
              </div>

              {/* Text answer input */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  คำตอบ / รายงานของนักเรียน (สามารถพิมพ์อธิบายเพิ่มเติม)
                </label>
                <textarea
                  rows={3}
                  placeholder="พิมพ์คำตอบ อธิบายแนวคิด หรือสรุปผลงานที่นี่..."
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Multi-File Upload Zone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    แนบไฟล์ผลงาน (เลือกได้หลายไฟล์พร้อมกันทุกรูปแบบ)
                  </label>
                  {attachedFiles.length > 0 && (
                    <span className="text-teal-700 font-semibold text-[11px]">
                      แนบแล้ว {attachedFiles.length} ไฟล์
                    </span>
                  )}
                </div>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="*/*"
                  multiple
                  className="hidden"
                />

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-800 text-xs mb-1">
                    ลากไฟล์หลายไฟล์มาวางที่นี่ หรือคลิกปุ่มเลือกไฟล์
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 max-w-md mx-auto">
                    รองรับรูปภาพ (JPG, PNG), เอกสาร PDF, Word, Excel, PowerPoint, ZIP, วิดีโอ, เสียง ทุกรูปแบบ
                  </p>

                  {/* Multi-file Quick Selection Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      id="btn-select-pdf"
                      onClick={() => pdfInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>แนบไฟล์ PDF</span>
                    </button>
                    <button
                      type="button"
                      id="btn-select-image"
                      onClick={() => imageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>แนบรูปภาพ</span>
                    </button>
                    <button
                      type="button"
                      id="btn-select-any-file"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>แนบไฟล์อื่นๆ / ทุกรูปแบบ</span>
                    </button>
                  </div>
                </div>

                {/* Attached Files List in Submit Modal */}
                {attachedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>รายการไฟล์ที่แนบไว้ ({attachedFiles.length} รายการ):</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-teal-700 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Plus className="w-3 h-3" /> เพิ่มไฟล์อีก
                      </button>
                    </div>

                    <FileListDisplay
                      files={attachedFiles}
                      onRemove={handleRemoveAttachedFile}
                      onPreview={(file) => setViewingFile(file)}
                    />
                  </div>
                )}

                {fileError && (
                  <div className="mt-2 text-[11px] text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              {/* Optional External Link */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  หรือแนบลิงก์เพิ่มเติม (เช่น Google Drive, Canva, YouTube, เว็บไซต์)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAsg(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-submit-work"
                  disabled={isSubmitting || isProcessingFiles}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งผลงาน...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ยืนยันการส่งการบ้าน ({attachedFiles.length} ไฟล์)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Permanent Student Work History Archive Modal */}
      {reviewHistoryItem && (
        <div
          id="student-work-history-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <History className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                    <span>คลังประวัติผลงานย้อนหลัง</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold mt-0.5">
                    {reviewHistoryItem.asg.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-review-history"
                onClick={() => setReviewHistoryItem(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 grow">
              {/* Submission Status & Score Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500">สถานะการประเมิน:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        reviewHistoryItem.sub.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {reviewHistoryItem.sub.status === 'graded' ? 'ตรวจเสร็จสมบูรณ์' : 'ส่งแล้ว กำลังรอคุณครูตรวจ'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ส่งเมื่อ: {reviewHistoryItem.sub.submittedAt ? new Date(reviewHistoryItem.sub.submittedAt).toLocaleString('th-TH') : '-'}
                    </span>
                  </div>
                </div>

                {reviewHistoryItem.sub.status === 'graded' && (
                  <div className="flex items-center gap-2">
                    <div className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-sm rounded-xl">
                      {reviewHistoryItem.sub.score} / {reviewHistoryItem.asg.maxScore} คะแนน
                    </div>
                    {reviewHistoryItem.sub.pointsAwarded ? (
                      <div className="px-3 py-1.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>+{reviewHistoryItem.sub.pointsAwarded} แต้ม</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Assignment Prompt */}
              {reviewHistoryItem.asg.description && (
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-xs space-y-1">
                  <div className="font-bold text-teal-900">คำสั่งและโจทย์การบ้าน:</div>
                  <p className="text-slate-700 leading-relaxed">{reviewHistoryItem.asg.description}</p>
                </div>
              )}

              {/* Student Submitted Text */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>เนื้อหาและคำตอบที่คุณส่ง:</span>
                </div>
                {reviewHistoryItem.sub.content ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {reviewHistoryItem.sub.content}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">ไม่มีข้อความบรรยาย (ส่งเป็นไฟล์แนบ)</p>
                )}
              </div>

              {/* Attached Files with Preview & Download */}
              {(() => {
                const files = getSubmissionFiles(reviewHistoryItem.sub);
                if (files.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-teal-600" />
                      <span>ไฟล์ผลงานที่แนบไว้ ({files.length} ไฟล์):</span>
                    </div>
                    <FileListDisplay
                      files={files}
                      onPreview={(file) => setViewingFile(file)}
                      readOnly
                    />
                  </div>
                );
              })()}

              {/* External Links */}
              {reviewHistoryItem.sub.fileUrl && (
                <div className="text-xs text-slate-700 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <ExternalLink className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-bold">ลิงก์ผลงาน:</span>
                  <a
                    href={reviewHistoryItem.sub.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 underline font-medium hover:text-teal-800 truncate"
                  >
                    {reviewHistoryItem.sub.fileUrl}
                  </a>
                </div>
              )}

              {/* Rubric Evaluation Breakdown */}
              {reviewHistoryItem.sub.rubricScores && reviewHistoryItem.sub.rubricScores.length > 0 && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>ผลการประเมินแยกตามเกณฑ์รูบิก:</span>
                  </div>
                  <div className="space-y-2">
                    {reviewHistoryItem.sub.rubricScores.map((rubric, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{rubric.title}</span>
                          {rubric.comment && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{rubric.comment}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg self-start sm:self-center">
                          {rubric.score} / {rubric.maxScore} คะแนน
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Remarks */}
              {reviewHistoryItem.sub.teacherFeedback && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>ข้อเสนอแนะจากคุณครูผู้สอน:</span>
                  </div>
                  <p className="text-blue-950 leading-relaxed">{reviewHistoryItem.sub.teacherFeedback}</p>
                </div>
              )}

              {/* AI Evaluation */}
              {reviewHistoryItem.sub.aiFeedback && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1.5">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>คำแนะนำจาก AI ผู้ช่วยการเรียนรู้:</span>
                  </div>
                  <p className="text-purple-950 leading-relaxed">{reviewHistoryItem.sub.aiFeedback}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                คุณสามารถกลับมาเปิดดูประวัติผลงานนี้ได้ตลอดเวลาในระบบ
              </span>
              <button
                type="button"
                onClick={() => setReviewHistoryItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
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

import React, { useState, useRef } from 'react';
import type { Classroom, Assignment, Submission, UserProfile, RubricCriterion, AttachedFile } from '../../types';
import { saveAssignment, deleteAssignment } from '../../services/firestoreService';
import { processSingleFile } from '../../lib/fileUpload';
import {
  FileText,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Users,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Download,
  Copy,
  ExternalLink,
  Eye,
  File,
  Paperclip,
  CheckSquare,
  Plus,
  Trash2,
  X,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { FileListDisplay } from '../common/FileListDisplay';
import { UniversalFileViewerModal } from '../common/UniversalFileViewerModal';
import { BatchAIGradingModal } from './BatchAIGradingModal';

interface AssignmentManagerProps {
  classroom: Classroom | null;
  assignments: Assignment[];
  submissions: Submission[];
  students?: UserProfile[];
  onOpenGradingModal: (submission: Submission, assignment: Assignment) => void;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  classroom,
  assignments,
  submissions,
  students = [],
  onOpenGradingModal,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'current' | 'all'>('current');
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Form State for creating assignment
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [maxScore, setMaxScore] = useState(10);
  const [pointsReward, setPointsReward] = useState(50);
  const [isCreating, setIsCreating] = useState(false);

  // File attachments for new assignment
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Assignment Confirmation State
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rubric creation builder inside assignment modal
  const [createRubrics, setCreateRubrics] = useState<RubricCriterion[]>([
    { id: 'crit_1', title: 'ความถูกต้องครบถ้วนของเนื้อหา', description: 'ตอบตรงประเด็นและมีความถูกต้อง', maxScore: 5 },
    { id: 'crit_2', title: 'การวิเคราะห์และเหตุผลประกอบ', description: 'แสดงขั้นตอนการคิดหรือหลักการ', maxScore: 3 },
    { id: 'crit_3', title: 'การนำเสนอและความเรียบร้อย', description: 'จัดวางเป็นระเบียบ สื่อความหมายชัดเจน', maxScore: 2 },
  ]);

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0];

  const handleAddCreateRubric = () => {
    setCreateRubrics([
      ...createRubrics,
      {
        id: `crit_${Date.now()}`,
        title: 'เกณฑ์ใหม่',
        description: '',
        maxScore: 2,
      },
    ]);
  };

  const handleRemoveCreateRubric = (id: string) => {
    setCreateRubrics(createRubrics.filter((r) => r.id !== id));
  };

  const handleUpdateCreateRubric = (id: string, updates: Partial<RubricCriterion>) => {
    setCreateRubrics(createRubrics.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

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
        setUploadError(`ไม่สามารถประมวลผลไฟล์ ${file.name} ได้: ${err?.message || ''}`);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    setIsUploadingFiles(false);
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAssignment(assignmentToDelete.id);
      const remaining = assignments.filter((a) => a.id !== assignmentToDelete.id);
      if (selectedAssignmentId === assignmentToDelete.id) {
        setSelectedAssignmentId(remaining[0]?.id || '');
      }
      setAssignmentToDelete(null);
    } catch (err) {
      console.error('Error deleting assignment:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !classroom) return;

    setIsCreating(true);
    try {
      const calculatedMax = createRubrics.length > 0
        ? createRubrics.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0)
        : Number(maxScore) || 10;

      const primaryFile = attachedFiles[0];

      const newAsg: Assignment = {
        id: `asg_${Date.now()}`,
        classroomId: classroom.id,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        maxScore: calculatedMax,
        pointsReward: Number(pointsReward) || 50,
        createdAt: new Date().toISOString(),
        rubrics: createRubrics.length > 0 ? createRubrics : undefined,
        fileName: primaryFile?.name,
        fileUrl: primaryFile?.url,
        fileType: primaryFile?.type,
        fileSize: primaryFile?.size,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
      };
      await saveAssignment(newAsg);
      setSelectedAssignmentId(newAsg.id);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setAttachedFiles([]);
      setUploadError(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับการบ้าน</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาสร้างหรือเลือกห้องเรียน เพื่อเริ่มมอบหมายงานและการบ้านแก่นักเรียน
        </p>
      </div>
    );
  }

  const relevantSubmissions = submissions.filter((s) => {
    if (!activeAssignment) return false;
    const matchAsg = s.assignmentId === activeAssignment.id;
    if (!matchAsg) return false;
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  // Google Sheets Export Logic
  const generateCurrentAssignmentSheetData = () => {
    if (!activeAssignment) return [];
    
    // Group all students in classroom to show submitted and not yet submitted
    const rows = (students.length > 0 ? students : relevantSubmissions.map((s) => ({ id: s.studentId, name: s.studentName, studentId: s.studentId }))).map((st, idx) => {
      const sub = submissions.find((s) => s.assignmentId === activeAssignment.id && (s.studentId === st.id || s.studentName === st.name));
      const statusText = !sub ? 'ยังไม่ส่ง' : sub.status === 'graded' ? 'ตรวจแล้ว' : 'ส่งแล้วรอตรวจ';
      const submittedDate = sub ? new Date(sub.submittedAt).toLocaleDateString('th-TH') : '-';
      const scoreText = sub?.score !== null && sub?.score !== undefined ? sub.score : '-';
      const pctText = sub?.score !== null && sub?.score !== undefined ? `${Math.round((sub.score / activeAssignment.maxScore) * 100)}%` : '-';
      
      const rubricsText = sub?.rubricScores && sub.rubricScores.length > 0
        ? sub.rubricScores.map((r) => `${r.title}: ${r.score}/${r.maxScore}`).join(' | ')
        : '-';

      return {
        index: idx + 1,
        studentId: st.studentId || st.id || '-',
        studentName: st.name || 'นักเรียน',
        assignmentTitle: activeAssignment.title,
        status: statusText,
        submittedAt: submittedDate,
        score: scoreText,
        maxScore: activeAssignment.maxScore,
        percentage: pctText,
        pointsAwarded: sub?.pointsAwarded || 0,
        rubricBreakdown: rubricsText,
        teacherFeedback: sub?.teacherFeedback || '-',
      };
    });

    return rows;
  };

  const generateAllAssignmentsSheetData = () => {
    const rows = students.map((st, idx) => {
      const studentSubs = submissions.filter((s) => s.studentId === st.id || s.studentName === st.name);
      const gradedSubs = studentSubs.filter((s) => s.status === 'graded');
      
      const totalScoreEarned = gradedSubs.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const totalPossibleMax = assignments.reduce((acc, a) => acc + a.maxScore, 0);
      const totalPoints = st.totalPoints || gradedSubs.reduce((acc, curr) => acc + (curr.pointsAwarded || 0), 0);
      const overallPct = totalPossibleMax > 0 ? `${Math.round((totalScoreEarned / totalPossibleMax) * 100)}%` : '0%';

      const rowObj: any = {
        index: idx + 1,
        studentId: st.studentId || st.id || '-',
        studentName: st.name || 'นักเรียน',
        completedCount: `${gradedSubs.length}/${assignments.length}`,
        totalScore: totalScoreEarned,
        totalMaxScore: totalPossibleMax,
        overallPercentage: overallPct,
        totalPoints,
      };

      // Also append scores for each individual assignment
      assignments.forEach((asg) => {
        const sub = studentSubs.find((s) => s.assignmentId === asg.id);
        rowObj[`asg_${asg.id}`] = sub?.score !== null && sub?.score !== undefined ? sub.score : sub ? 'รอตรวจ' : 'ยังไม่ส่ง';
      });

      return rowObj;
    });

    return rows;
  };

  const handleDownloadCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for perfect Thai character support in Excel & Google Sheets

    if (exportType === 'current' && activeAssignment) {
      const headers = [
        'ลำดับ',
        'รหัสนักเรียน',
        'ชื่อ-นามสกุล',
        'ชื่องาน',
        'สถานะการส่ง',
        'วันที่ส่ง',
        'คะแนนที่ได้',
        'คะแนนเต็ม',
        'คิดเป็นร้อยละ',
        'แต้มที่ได้รับ',
        'คะแนนแยกตามเกณฑ์รูบิก',
        'ข้อเสนอแนะของครู',
      ];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

      const data = generateCurrentAssignmentSheetData();
      data.forEach((row) => {
        const rowVals = [
          row.index,
          row.studentId,
          row.studentName,
          row.assignmentTitle,
          row.status,
          row.submittedAt,
          row.score,
          row.maxScore,
          row.percentage,
          row.pointsAwarded,
          row.rubricBreakdown,
          row.teacherFeedback,
        ];
        csvContent += rowVals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `คะแนนการบ้าน_${activeAssignment.title.replace(/\s+/g, '_')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // All assignments summary
      const headers = [
        'ลำดับ',
        'รหัสนักเรียน',
        'ชื่อ-นามสกุล',
        'จำนวนงานที่ส่งแล้ว',
        'คะแนนรวมที่ได้',
        'คะแนนเต็มทั้งหมด',
        'ร้อยละคะแนนรวม',
        'แต้มสะสมรวม',
        ...assignments.map((a) => a.title),
      ];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

      const data = generateAllAssignmentsSheetData();
      data.forEach((row) => {
        const rowVals = [
          row.index,
          row.studentId,
          row.studentName,
          row.completedCount,
          row.totalScore,
          row.totalMaxScore,
          row.overallPercentage,
          row.totalPoints,
          ...assignments.map((a) => row[`asg_${a.id}`]),
        ];
        csvContent += rowVals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `สรุปคะแนนนักเรียนรายบุคคล_${classroom.name.replace(/\s+/g, '_')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyClipboardTable = () => {
    let tsvContent = '';

    if (exportType === 'current' && activeAssignment) {
      const headers = [
        'ลำดับ',
        'รหัสนักเรียน',
        'ชื่อ-นามสกุล',
        'ชื่องาน',
        'สถานะการส่ง',
        'วันที่ส่ง',
        'คะแนนที่ได้',
        'คะแนนเต็ม',
        'คิดเป็นร้อยละ',
        'แต้มที่ได้รับ',
        'คะแนนรูบิก',
        'ข้อเสนอแนะ',
      ];
      tsvContent += headers.join('\t') + '\n';

      const data = generateCurrentAssignmentSheetData();
      data.forEach((row) => {
        tsvContent += [
          row.index,
          row.studentId,
          row.studentName,
          row.assignmentTitle,
          row.status,
          row.submittedAt,
          row.score,
          row.maxScore,
          row.percentage,
          row.pointsAwarded,
          row.rubricBreakdown,
          row.teacherFeedback,
        ].join('\t') + '\n';
      });
    } else {
      const headers = [
        'ลำดับ',
        'รหัสนักเรียน',
        'ชื่อ-นามสกุล',
        'จำนวนงานที่ส่งแล้ว',
        'คะแนนรวมที่ได้',
        'คะแนนเต็มทั้งหมด',
        'ร้อยละรวม',
        'แต้มสะสม',
        ...assignments.map((a) => a.title),
      ];
      tsvContent += headers.join('\t') + '\n';

      const data = generateAllAssignmentsSheetData();
      data.forEach((row) => {
        tsvContent += [
          row.index,
          row.studentId,
          row.studentName,
          row.completedCount,
          row.totalScore,
          row.totalMaxScore,
          row.overallPercentage,
          row.totalPoints,
          ...assignments.map((a) => row[`asg_${a.id}`]),
        ].join('\t') + '\n';
      });
    }

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ระบบสั่งและตรวจการบ้าน</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            มอบหมายงาน ตรวจสอบผลงานทุกรูปแบบไฟล์ รองรับเกณฑ์รูบิก และสรุปคะแนนส่งออก Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-export-google-sheets"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>สรุปคะแนนเป็น Google Sheets</span>
          </button>

          <button
            type="button"
            id="btn-open-create-asg"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สั่งการบ้านใหม่</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assignment List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>รายการการบ้าน ({assignments.length})</span>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              ยังไม่มีการบ้าน คลิก "สั่งการบ้านใหม่" เพื่อเริ่มต้น
            </div>
          ) : (
            assignments.map((asg) => {
              const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
              const pendingCount = asgSubs.filter((s) => s.status === 'submitted').length;
              const isSelected = asg.id === activeAssignment?.id;

              return (
                <div
                  key={asg.id}
                  id={`asg-card-${asg.id}`}
                  onClick={() => setSelectedAssignmentId(asg.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{asg.title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                          รอตรวจ {pendingCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignmentToDelete(asg);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบการบ้านนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{asg.description}</p>
                  
                  {asg.rubrics && asg.rubrics.length > 0 && (
                    <div className="mt-2 text-[10px] text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md inline-block font-semibold">
                      มีเกณฑ์รูบิก {asg.rubrics.length} ข้อ
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      ส่งภายใน: {asg.dueDate}
                    </span>
                    <span className="text-amber-600 font-semibold">+{asg.pointsReward} แต้ม</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 2 Cols: Submissions for Active Assignment */}
        <div className="lg:col-span-2 space-y-4">
          {activeAssignment ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header Info */}
              <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">{activeAssignment.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold">
                      คะแนนเต็ม {activeAssignment.maxScore} คะแนน
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {activeAssignment.pointsReward} แต้ม
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssignmentToDelete(activeAssignment)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="ลบการบ้านนี้ออกจากระบบ"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>ลบการบ้าน</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {activeAssignment.description}
                </p>

                {/* Teacher Attached Files/Worksheets */}
                {((activeAssignment.files && activeAssignment.files.length > 0) || activeAssignment.fileUrl || activeAssignment.fileName) && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1.5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ไฟล์ใบงานและเอกสารแนบประกอบการบ้าน:</span>
                    </div>
                    <FileListDisplay
                      files={
                        activeAssignment.files && activeAssignment.files.length > 0
                          ? activeAssignment.files
                          : [
                              {
                                name: activeAssignment.fileName || 'ไฟล์ใบงานแนบ',
                                type: activeAssignment.fileType || 'application/octet-stream',
                                size: activeAssignment.fileSize || 0,
                                url: activeAssignment.fileUrl,
                                uploadStatus: 'ready',
                              },
                            ]
                      }
                      onPreview={(f) => setViewingFile(f)}
                      readOnly
                    />
                  </div>
                )}

                {/* Rubrics Pill display */}
                {activeAssignment.rubrics && activeAssignment.rubrics.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">เกณฑ์รูบิก:</span>
                    {activeAssignment.rubrics.map((r) => (
                      <span key={r.id} className="text-[10px] bg-white border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md font-medium">
                        {r.title} ({r.maxScore} คะแนน)
                      </span>
                    ))}
                  </div>
                )}

                {/* Submissions Filter */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs font-semibold text-slate-700">
                    งานที่นักเรียนส่งมา ({relevantSubmissions.length} รายการ)
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('submitted')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterStatus === 'submitted' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      รอตรวจ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('graded')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterStatus === 'graded' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ตรวจแล้ว
                    </button>
                    {relevantSubmissions.filter((s) => s.status === 'submitted').length > 0 && (
                      <button
                        type="button"
                        id="btn-batch-grade-asg"
                        onClick={() => setIsBatchModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ AI ตรวจงาน ({relevantSubmissions.filter((s) => s.status === 'submitted').length})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submissions Table / Cards */}
              <div className="divide-y divide-slate-100">
                {relevantSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    ยังไม่มีการส่งงานตามเงื่อนไขที่เลือก
                  </div>
                ) : (
                  relevantSubmissions.map((sub) => {
                    const subFiles: AttachedFile[] =
                      sub.files && Array.isArray(sub.files) && sub.files.length > 0
                        ? sub.files
                        : sub.fileData || sub.fileUrl || sub.fileName
                        ? [
                            {
                              name: sub.fileName || 'ไฟล์ผลงาน',
                              type: sub.fileType || 'application/octet-stream',
                              size: sub.fileSize || 0,
                              url: sub.fileUrl,
                              data: sub.fileData,
                              uploadStatus: 'ready',
                            },
                          ]
                        : [];

                    return (
                      <div
                        key={sub.id}
                        className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{sub.studentName}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                sub.status === 'graded'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.status === 'graded' ? `ตรวจแล้ว (${sub.score} / ${activeAssignment.maxScore} คะแนน)` : 'รอคุณครูตรวจ'}
                            </span>
                          </div>

                          {sub.content && (
                            <p className="text-xs text-slate-600 line-clamp-1 italic">
                              "{sub.content}"
                            </p>
                          )}

                          {/* Student Attached Files display */}
                          {subFiles.length > 0 && (
                            <div className="pt-1">
                              <FileListDisplay
                                files={subFiles}
                                onPreview={(f) => setViewingFile(f)}
                                readOnly
                              />
                            </div>
                          )}

                          {/* Rubric scores breakdown tag */}
                          {sub.rubricScores && sub.rubricScores.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {sub.rubricScores.map((rs, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  {rs.title}: <strong>{rs.score}</strong>/{rs.maxScore}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400">
                            ส่งเมื่อ: {new Date(sub.submittedAt).toLocaleString('th-TH')}
                          </div>
                        </div>

                        <button
                          type="button"
                          id={`btn-open-grade-${sub.id}`}
                          onClick={() => onOpenGradingModal(sub, activeAssignment)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                            sub.status === 'graded'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{sub.status === 'graded' ? 'ดูผล / แก้ไขรูบิก' : 'ตรวจงานด้วย AI & รูบิก'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              กรุณาเลือกการบ้านทางซ้ายมือ
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="font-bold text-base">สรุปคะแนนส่งออก Google Sheets</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Export Mode Selection */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  เลือกรูปแบบการสรุปคะแนน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setExportType('current')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      exportType === 'current'
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">สรุปการบ้านชิ้นนี้ ({activeAssignment?.title || 'งานปัจจุบัน'})</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      แสดงรายชื่อนักเรียน คะแนนที่ได้ เกณฑ์รูบิก และข้อเสนอแนะครู
                    </div>
                  </div>

                  <div
                    onClick={() => setExportType('all')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      exportType === 'all'
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">สรุปคะแนนรวมทุกคนในห้องเรียน (สมุดคะแนน)</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      สรุปคะแนนสะสมรายบุคคล เปอร์เซ็นต์รวม และคะแนนแยกทุกชิ้นงาน
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: CSV, Copy, and Open Google Sheets */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs">
                  เลือกวิธีนำเข้า Google Sheets:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl flex flex-col items-center justify-center gap-1 shadow-2xs text-center"
                  >
                    <Download className="w-5 h-5 text-emerald-600" />
                    <span>ดาวน์โหลด CSV</span>
                    <span className="text-[10px] text-slate-400 font-normal">UTF-8 BOM ภาษาไทยไม่เพี้ยน</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyClipboardTable}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl flex flex-col items-center justify-center gap-1 shadow-2xs text-center"
                  >
                    <Copy className="w-5 h-5 text-blue-600" />
                    <span>{copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอกตาราง'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">กด Ctrl+V วางใน Sheet ได้เลย</span>
                  </button>

                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 shadow-md text-center"
                  >
                    <ExternalLink className="w-5 h-5 text-emerald-100" />
                    <span>เปิด Google Sheets</span>
                    <span className="text-[10px] text-emerald-200 font-normal">สร้างชีตว่างทันที (sheets.new)</span>
                  </a>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  💡 <strong>คำแนะนำ:</strong> คลิก <em>"เปิด Google Sheets"</em> เพื่อเปิดแท็บชีตใหม่ แล้วคลิก <em>"คัดลอกตาราง"</em> จากนั้นกด <strong>Ctrl+V</strong> ใน Google Sheets เพื่อวางข้อมูลคะแนนได้ทันทีใน 1 วินาที! หรือใช้เมนู <em>ไฟล์ &gt; นำเข้า</em> แล้วอัปโหลดไฟล์ CSV ที่ดาวน์โหลดได้เช่นกัน
                </p>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  ตัวอย่างข้อมูลที่จะส่งออก (Preview):
                </span>
                <div className="max-h-48 overflow-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-700 sticky top-0">
                      {exportType === 'current' ? (
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">รหัส</th>
                          <th className="p-2">ชื่อนักเรียน</th>
                          <th className="p-2">สถานะ</th>
                          <th className="p-2">คะแนน</th>
                          <th className="p-2">ร้อยละ</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">รหัส</th>
                          <th className="p-2">ชื่อนักเรียน</th>
                          <th className="p-2">ส่งงานแล้ว</th>
                          <th className="p-2">คะแนนรวม</th>
                          <th className="p-2">แต้มสะสม</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(exportType === 'current' ? generateCurrentAssignmentSheetData() : generateAllAssignmentsSheetData()).map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400">{r.index}</td>
                          <td className="p-2 font-mono text-[10px] text-slate-600">{r.studentId}</td>
                          <td className="p-2 font-bold text-slate-800">{r.studentName}</td>
                          <td className="p-2">{exportType === 'current' ? r.status : r.completedCount}</td>
                          <td className="p-2 font-bold text-indigo-700">{exportType === 'current' ? `${r.score}/${r.maxScore}` : `${r.totalScore}/${r.totalMaxScore}`}</td>
                          <td className="p-2 text-slate-600">{exportType === 'current' ? r.percentage : `${r.totalPoints} แต้ม`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal with Rubric Builder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <span>สั่งการบ้านใหม่สำหรับห้องเรียน</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  หัวข้อ / ชื่องาน *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น รายงานการทดลองและวิเคราะห์ผลแล็บวิทยาศาสตร์"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  คำชี้แจงและโจทย์ *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="อธิบายรายละเอียดสิ่งที่นักเรียนต้องทำ เกณฑ์การส่งงาน รองรับทั้งข้อความ รูปภาพ และไฟล์แนบ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    กำหนดส่ง
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    แต้มสะสมรางวัล (Points)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pointsReward}
                    onChange={(e) => setPointsReward(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-amber-700 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Rubric Criteria Builder */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-indigo-700" />
                      <span>เกณฑ์การให้คะแนนแบบรูบิก (Rubric Criteria)</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      คะแนนรวมของการบ้านนี้จะคำนวณจากผลรวมคะแนนรูบิกอัตโนมัติ
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCreateRubric}
                    className="px-2.5 py-1 text-xs bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 font-bold rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มเกณฑ์</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {createRubrics.map((r, i) => (
                    <div key={r.id || i} className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={r.title}
                        onChange={(e) => handleUpdateCreateRubric(r.id, { title: e.target.value })}
                        placeholder="ชื่อเกณฑ์ เช่น ความถูกต้อง"
                        className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={r.maxScore}
                          onChange={(e) => handleUpdateCreateRubric(r.id, { maxScore: Number(e.target.value) || 1 })}
                          className="w-12 px-1 py-1 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-md"
                        />
                        <span className="text-[11px] text-slate-500">คะแนน</span>
                      </div>
                      {createRubrics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCreateRubric(r.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-right text-xs font-bold text-indigo-900 pt-1">
                  คะแนนเต็มรวม: {createRubrics.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0)} คะแนน
                </div>
              </div>

              {/* File Attachments Section for Homework/Worksheets */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>แนบไฟล์ใบงาน / เอกสารประกอบการสอน (ทุกรูปแบบไฟล์)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFiles}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(e) => handleFileSelection(e.target.files)}
                  className="hidden"
                />

                <p className="text-[11px] text-slate-500">
                  รองรับไฟล์ทุกประเภท: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), รูปภาพ, วิดีโอ, เสียง, ZIP ฯลฯ
                </p>

                {isUploadingFiles && (
                  <div className="p-2.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>กำลังอัปโหลดและประมวลผลไฟล์แนบ...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

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
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-asg"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isCreating ? 'กำลังบันทึก...' : 'มอบหมายการบ้าน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Assignment Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบการบ้าน?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ต้องการลบการบ้าน <strong className="text-slate-900">"{assignmentToDelete.title}"</strong> ออกจากระบบหรือไม่?
              </p>
              <div className="p-3 bg-rose-50 text-rose-800 text-[11px] rounded-xl text-left border border-rose-100">
                ⚠️ การลบการบ้านนี้จะลบข้อมูลการบ้านและผลงานที่นักเรียนส่งมาสำหรับงานนี้ออกจากระบบ
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-semibold text-xs text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteAssignment}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบการบ้าน'}</span>
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

      <BatchAIGradingModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        submissions={relevantSubmissions.filter((s) => s.status === 'submitted')}
        assignments={assignments}
      />
    </div>
  );
};

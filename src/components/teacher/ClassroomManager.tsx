import React, { useState, useEffect } from 'react';
import type { Classroom, UserProfile, Submission, AttendanceRecord, BehaviorRecord } from '../../types';
import {
  updateClassroom,
  deleteClassroom,
  saveUserProfile,
  removeStudentFromClassroom,
  addStudentToClassroom,
  getClassroomStudents,
  getAllRegisteredStudents,
} from '../../services/firestoreService';
import {
  Key,
  Copy,
  Check,
  User,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Users,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Palette,
  Calendar,
  AlertTriangle,
  Plus,
  UserCheck,
} from 'lucide-react';

interface ClassroomManagerProps {
  classroom: Classroom | null;
  submissions: Submission[];
  attendanceRecords: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  isOpen: boolean;
  onClose: () => void;
  onClassroomUpdated?: (updated: Classroom) => void;
  onClassroomDeleted?: (classroomId: string) => void;
  onOpenCreateClassroom?: () => void;
}

const COLOR_PRESETS = [
  { id: 'emerald', label: 'เขียวมรกต', gradient: 'from-emerald-600 to-teal-700' },
  { id: 'blue', label: 'ฟ้าน้ำเงิน', gradient: 'from-blue-600 to-indigo-700' },
  { id: 'purple', label: 'ม่วงรอยัล', gradient: 'from-purple-600 to-indigo-800' },
  { id: 'rose', label: 'ชมพูกุหลาบ', gradient: 'from-rose-500 to-pink-700' },
  { id: 'amber', label: 'ส้มอำพัน', gradient: 'from-amber-500 to-orange-600' },
  { id: 'slate', label: 'สเลทเข้ม', gradient: 'from-slate-700 to-slate-900' },
];

export const ClassroomManager: React.FC<ClassroomManagerProps> = ({
  classroom,
  submissions,
  attendanceRecords,
  behaviors,
  isOpen,
  onClose,
  onClassroomUpdated,
  onClassroomDeleted,
  onOpenCreateClassroom,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'students' | 'import' | 'backup' | 'settings'>('code');
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit Classroom Settings state
  const [editName, setEditName] = useState(classroom?.name || '');
  const [editSubject, setEditSubject] = useState(classroom?.subject || '');
  const [editCode, setEditCode] = useState(classroom?.code || '');
  const [editSchedule, setEditSchedule] = useState(classroom?.schedule || '');
  const [editDescription, setEditDescription] = useState(classroom?.description || '');
  const [editColor, setEditColor] = useState(classroom?.color || COLOR_PRESETS[0].gradient);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Classroom Students Management State
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [allRegisteredStudents, setAllRegisteredStudents] = useState<UserProfile[]>([]);
  const [selectedRegisteredStudentId, setSelectedRegisteredStudentId] = useState('');
  const [addMode, setAddMode] = useState<'manual' | 'existing'>('manual');
  const [studentSearch, setStudentSearch] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);

  // Manual Add Student Form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('ม.3/1');

  // Edit Student Form
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);

  // Batch Import Text
  const [importText, setImportText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Delete Classroom Confirmation State
  const [isConfirmingDeleteClass, setIsConfirmingDeleteClass] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Load classroom students & registered students on open/change
  useEffect(() => {
    if (!classroom) {
      setStudents([]);
      setIsLoadingStudents(false);
      return;
    }
    let isMounted = true;
    const loadClassroomStudents = async () => {
      setIsLoadingStudents(true);
      const studentIds = (classroom.studentIds || []).filter((id) => id !== classroom.teacherId);
      const list = await getClassroomStudents(studentIds);
      const allReg = await getAllRegisteredStudents();
      if (isMounted) {
        setStudents(list);
        setAllRegisteredStudents(allReg);
        setIsLoadingStudents(false);
      }
    };

    loadClassroomStudents();
    return () => {
      isMounted = false;
    };
  }, [classroom?.id, classroom?.studentIds?.join(',')]);

  useEffect(() => {
    if (!classroom) return;
    setEditName(classroom.name);
    setEditSubject(classroom.subject);
    setEditCode(classroom.code);
    setEditSchedule(classroom.schedule || '');
    setEditDescription(classroom.description || '');
    setEditColor(classroom.color || COLOR_PRESETS[0].gradient);
  }, [classroom]);

  if (!isOpen) return null;

  if (!classroom) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">ยังไม่มีห้องเรียนที่เลือก</h3>
          <p className="text-xs text-slate-500">กรุณาสร้างห้องเรียนใหม่ เพื่อเริ่มจัดการรายชื่อนักเรียนและรหัสห้อง</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              ปิด
            </button>
            {onOpenCreateClassroom && (
              <button
                type="button"
                onClick={onOpenCreateClassroom}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm"
              >
                สร้างห้องเรียนใหม่
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddManualStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStdId = newStudentId.trim();
    const cleanName = newStudentName.trim();
    if (!cleanName || !cleanStdId) return;

    // Check if an existing registered student already has this studentId or email
    const existingStd = allRegisteredStudents.find(
      (s) =>
        s.studentId === cleanStdId ||
        s.email.toLowerCase() === `${cleanStdId}@thainiyom.ac.th`.toLowerCase() ||
        s.email.toLowerCase() === `${cleanStdId}@school.ac.th`.toLowerCase() ||
        s.id === `std_${cleanStdId}`
    );

    const studentToAdd: UserProfile = existingStd
      ? {
          ...existingStd,
          name: cleanName || existingStd.name,
          grade: newStudentGrade || existingStd.grade || 'ม.3/1',
          studentId: cleanStdId,
        }
      : {
          id: `std_${cleanStdId}`,
          email: `${cleanStdId}@thainiyom.ac.th`,
          name: cleanName,
          role: 'student',
          studentId: cleanStdId,
          grade: newStudentGrade,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          totalPoints: 100,
          level: 1,
          createdAt: new Date().toISOString(),
        };

    try {
      await saveUserProfile(studentToAdd);
      await addStudentToClassroom(classroom.id, studentToAdd.id);

      const updatedStudentIds = Array.from(new Set([...(classroom.studentIds || []), studentToAdd.id]));
      const updatedClassroom = { ...classroom, studentIds: updatedStudentIds };
      
      // Update local student list and registered list immediately
      setStudents((prev) => [...prev.filter((s) => s.id !== studentToAdd.id), studentToAdd]);
      setAllRegisteredStudents((prev) => [...prev.filter((s) => s.id !== studentToAdd.id), studentToAdd]);

      if (onClassroomUpdated) {
        onClassroomUpdated(updatedClassroom);
      }

      setNewStudentName('');
      setNewStudentId('');
      setStatusNotice({ type: 'success', message: `เพิ่มนักเรียน "${studentToAdd.name}" เข้าสู่ห้องเรียนสำเร็จ` });
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err) {
      console.error(err);
      setStatusNotice({ type: 'error', message: 'เกิดข้อผิดพลาดในการเพิ่มนักเรียน' });
    }
  };

  const handleAddExistingStudent = async () => {
    if (!selectedRegisteredStudentId) return;
    const std = allRegisteredStudents.find((s) => s.id === selectedRegisteredStudentId);
    if (!std) return;

    try {
      await addStudentToClassroom(classroom.id, std.id);
      const updatedStudentIds = Array.from(new Set([...(classroom.studentIds || []), std.id]));
      const updatedClassroom = { ...classroom, studentIds: updatedStudentIds };
      if (onClassroomUpdated) {
        onClassroomUpdated(updatedClassroom);
      }

      setStudents((prev) => [...prev.filter((s) => s.id !== std.id), std]);
      setSelectedRegisteredStudentId('');
      setStatusNotice({ type: 'success', message: `เพิ่มนักเรียน "${std.name}" เข้าสู่ห้องเรียนเรียบร้อย` });
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err) {
      console.error(err);
      setStatusNotice({ type: 'error', message: 'เกิดข้อผิดพลาดในการเพิ่มนักเรียน' });
    }
  };

  const handleConfirmRemoveStudent = async () => {
    if (!studentToDelete) return;
    const std = studentToDelete;
    setStudentToDelete(null);

    try {
      await removeStudentFromClassroom(classroom.id, std.id);
      const updatedStudentIds = (classroom.studentIds || []).filter((id) => id !== std.id);
      const updatedClassroom = { ...classroom, studentIds: updatedStudentIds };
      if (onClassroomUpdated) {
        onClassroomUpdated(updatedClassroom);
      }

      setStudents((prev) => prev.filter((s) => s.id !== std.id));
      setStatusNotice({ type: 'success', message: `นำนักเรียน "${std.name}" ออกจากห้องเรียนแล้ว` });
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err) {
      console.error(err);
      setStatusNotice({ type: 'error', message: 'เกิดข้อผิดพลาดในการนำนักเรียนออก' });
    }
  };

  const handleBatchImport = async () => {
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    let addedCount = 0;
    const newStudentObjects: UserProfile[] = [];
    const newIds: string[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        const id = parts[0];
        const name = parts[1];
        const grade = parts[2] || 'ม.3/1';

        const profile: UserProfile = {
          id: `std_${id}`,
          email: `${id}@thainiyom.ac.th`,
          name,
          role: 'student',
          studentId: id,
          grade,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          totalPoints: 100,
          level: 1,
          createdAt: new Date().toISOString(),
        };

        await saveUserProfile(profile);
        await addStudentToClassroom(classroom.id, profile.id);
        newStudentObjects.push(profile);
        newIds.push(profile.id);
        addedCount++;
      }
    }

    const updatedStudentIds = Array.from(new Set([...(classroom.studentIds || []), ...newIds]));
    const updatedClassroom = { ...classroom, studentIds: updatedStudentIds };
    if (onClassroomUpdated) {
      onClassroomUpdated(updatedClassroom);
    }

    setStudents((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      newStudentObjects.forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    });

    setImportSuccessMsg(`นำเข้าข้อมูลนักเรียนสำเร็จ ${addedCount} คน และเพิ่มเข้าสู่ห้องเรียนเรียบร้อย`);
    setImportText('');
    setTimeout(() => setImportSuccessMsg(null), 4000);
  };

  // Export & Backup Classroom Data as JSON
  const handleExportBackup = () => {
    const backupData = {
      classroom,
      students: students,
      submissions,
      attendanceRecords,
      behaviors,
      backupDate: new Date().toISOString(),
      version: '1.0',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ThaiNiyom_Backup_${classroom.code}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editSubject.trim() || !editCode.trim()) return;

    setIsSavingSettings(true);
    try {
      const updates = {
        name: editName.trim(),
        subject: editSubject.trim(),
        code: editCode.trim().toUpperCase(),
        schedule: editSchedule.trim(),
        description: editDescription.trim(),
        color: editColor,
      };

      await updateClassroom(classroom.id, updates);
      if (onClassroomUpdated) {
        onClassroomUpdated({ ...classroom, ...updates });
      }
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
      setStatusNotice({ type: 'error', message: 'บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const confirmDeleteClassroom = async () => {
    if (!classroom) return;
    setIsDeletingClass(true);
    try {
      await deleteClassroom(classroom.id);
      if (onClassroomDeleted) {
        onClassroomDeleted(classroom.id);
      }
      setIsConfirmingDeleteClass(false);
      onClose();
    } catch (err) {
      console.error('Error deleting classroom:', err);
      setStatusNotice({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบห้องเรียน กรุณาลองใหม่อีกครั้ง' });
      setIsDeletingClass(false);
    }
  };

  return (
    <div id="classroom-manager-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">จัดการห้องเรียนและข้อมูลนักเรียน</h2>
              <p className="text-xs text-slate-300">{classroom.name} (รหัส: {classroom.code})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCreateClassroom && (
              <button
                type="button"
                id="btn-shortcut-create-class"
                onClick={() => {
                  onClose();
                  onOpenCreateClassroom();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>สร้างห้องใหม่</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>รหัสเข้าห้องเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อนักเรียน ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าไฟล์ / ข้อมูลกลุ่ม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>แก้ไข & ตั้งค่าห้องเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>สำรองข้อมูลอัตโนมัติ</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 text-xs space-y-4 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: CLASSROOM CODE */}
          {activeTab === 'code' && (
            <div className="text-center space-y-6 py-4">
              <div className="max-w-md mx-auto p-8 bg-linear-to-b from-indigo-50/80 to-white border-2 border-indigo-200/80 rounded-3xl shadow-sm space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Key className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800">รหัสประจำห้องเรียน (Classroom Code)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    บอกรหัส 6 หลักนี้ให้นักเรียนกรอกเพื่อเข้าร่วมห้องเรียน {classroom.name}
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border-2 border-indigo-300 shadow-inner flex items-center justify-center gap-3">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-indigo-700 select-all">
                    {classroom.code}
                  </span>
                  <button
                    type="button"
                    id="btn-copy-class-code"
                    onClick={handleCopyCode}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="คัดลอกรหัสเข้าห้องเรียน"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {copiedCode && (
                  <p className="text-xs text-emerald-600 font-bold animate-in fade-in">
                    ✓ คัดลอกรหัสเข้าห้องเรียนเรียบร้อยแล้ว!
                  </p>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                  <div className="font-bold text-slate-800">คำแนะนำสำหรับนักเรียน:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>เข้าสู่ระบบด้วยบัญชีนักเรียน</li>
                    <li>กดปุ่ม <strong>"เข้าร่วมห้องเรียน"</strong> ที่หน้าหลัก</li>
                    <li>กรอกรหัส 6 หลัก <strong>{classroom.code}</strong> แล้วกดยืนยัน</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS ROSTER & EDIT */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Feedback Alert Notice */}
              {statusNotice && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
                    statusNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{statusNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusNotice(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Add Student Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>เพิ่มนักเรียนเข้าห้องเรียน</span>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setAddMode('manual')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        addMode === 'manual'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      กรอกข้อมูลเอง
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('existing')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        addMode === 'existing'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      เลือกจากบัญชีที่ลงทะเบียน
                      {allRegisteredStudents.filter((r) => !students.some((s) => s.id === r.id || s.email === r.email)).length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                          {allRegisteredStudents.filter((r) => !students.some((s) => s.id === r.id || s.email === r.email)).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {addMode === 'manual' ? (
                  <form onSubmit={handleAddManualStudent} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="รหัสนักเรียน (เช่น 65005)"
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="ชื่อ - นามสกุล"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ชั้น (เช่น ม.3/1)"
                          value={newStudentGrade}
                          onChange={(e) => setNewStudentGrade(e.target.value)}
                          className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 w-24 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          className="grow px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                        >
                          + เพิ่มนักเรียน
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const unenrolled = allRegisteredStudents.filter(
                        (r) => !students.some((s) => s.id === r.id || s.email === r.email)
                      );
                      if (unenrolled.length === 0) {
                        return (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                            ไม่มีบัญชีนักเรียนอื่นที่ยังไม่ได้เข้าห้องนี้ (นักเรียนทั้งหมดเข้าร่วมห้องเรียนเรียบร้อยแล้ว หรือยังไม่มีการลงทะเบียนใหม่)
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedRegisteredStudentId}
                            onChange={(e) => setSelectedRegisteredStudentId(e.target.value)}
                            className="grow p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- เลือกบัญชีนักเรียนที่ลงทะเบียนไว้ --</option>
                            {unenrolled.map((std) => (
                              <option key={std.id} value={std.id}>
                                {std.name} ({std.studentId || std.email}) - {std.grade || 'นักเรียน'}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedRegisteredStudentId}
                            onClick={handleAddExistingStudent}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-all shrink-0"
                          >
                            + เพิ่มเข้าห้องเรียน
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Roster Controls: Filter & Search */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-xs font-bold text-slate-700">
                  รายชื่อในห้องเรียน ({students.length} คน)
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-56 p-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Roster List */}
              {isLoadingStudents ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  กำลังโหลดรายชื่อนักเรียน...
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  ยังไม่มีนักเรียนในห้องเรียนนี้ คุณครูสามารถเพิ่มนักเรียนได้จากฟอร์มด้านบน
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
                  {students
                    .filter((std) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return (
                        std.name.toLowerCase().includes(q) ||
                        (std.studentId && std.studentId.toLowerCase().includes(q)) ||
                        (std.email && std.email.toLowerCase().includes(q))
                      );
                    })
                    .map((std) => (
                      <div key={std.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{std.name}</div>
                            <div className="text-[11px] text-slate-500">
                              รหัส: {std.studentId || '-'} | {std.grade || 'นักเรียน'}
                              {std.email && !std.email.includes('@school.ac.th') && !std.email.includes('@thainiyom.ac.th') && (
                                <span className="ml-1 text-slate-400 font-normal">({std.email})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {std.totalPoints || 0} แต้ม
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingStudent(std)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="แก้ไขข้อมูลนักเรียน"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(std)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="นำออกจากห้องเรียน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Inline Confirmation Dialog for Removing Student */}
              {studentToDelete && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>ยืนยันการนำนักเรียนออกจากห้องเรียน</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    คุณครูต้องการนำ <strong>"{studentToDelete.name}"</strong> (รหัส: {studentToDelete.studentId || studentToDelete.email}) ออกจากห้องเรียนนี้หรือไม่?
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStudentToDelete(null)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRemoveStudent}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      ยืนยันนำออก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BATCH / FILE IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>นำเข้ารายชื่อนักเรียนแบบกลุ่ม (Batch / CSV Import)</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  รองรับการวางข้อมูลจาก Excel / Google Sheets รูปแบบ: <code>รหัสนักเรียน, ชื่อ-นามสกุล, ชั้นเรียน</code> (หนึ่งคนต่อหนึ่งบรรทัด)
                </p>
              </div>

              <div>
                <textarea
                  rows={6}
                  placeholder={`65005, ด.ญ. อารยา แก้วมณี, ม.3/1\n65006, ด.ช. กิตติพงษ์ มั่นคง, ม.3/1\n65007, ด.ญ. พิมพ์มาดา อ่อนหวาน, ม.3/1`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full p-3 font-mono bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleBatchImport}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>ประมวลผลและนำเข้านักเรียน</span>
              </button>
            </div>
          )}

          {/* TAB 4: AUTOMATED BACKUP & EXPORT */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>ระบบสำรองข้อมูลอัตโนมัติ เพื่อป้องกันการสูญหายของคะแนน</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  คุณครูสามารถดาวน์โหลดไฟล์สำรองคะแนน งานที่ส่ง และสถิติการเข้าเรียนทั้งหมดไว้ในเครื่องได้ตลอดเวลา
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="font-semibold text-slate-800">รายการข้อมูลที่จะทำการสำรอง:</div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
                  <li>ข้อมูลห้องเรียน: {classroom.name}</li>
                  <li>รายชื่อนักเรียนและประวัติ ({students.length} คน)</li>
                  <li>ประวัติการส่งการบ้านและคะแนนสอบ ({submissions.length} รายการ)</li>
                  <li>บันทึกการเช็คชื่อรายวันและรายเดือน ({attendanceRecords.length} วัน)</li>
                  <li>บันทึกพฤติกรรมและการตัด/เพิ่มแต้ม ({behaviors.length} รายการ)</li>
                </ul>

                <button
                  type="button"
                  id="btn-download-backup"
                  onClick={handleExportBackup}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์สำรองข้อมูล (JSON Backup File)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CLASSROOM SETTINGS & DANGER ZONE */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>แก้ไขข้อมูลพื้นฐานห้องเรียน</span>
                  </h3>
                  {saveSuccessMsg && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>บันทึกการแก้ไขเรียบร้อย!</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    ชื่อห้องเรียน / ชั้นเรียน
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      วิชา / รหัสวิชา
                    </label>
                    <input
                      type="text"
                      required
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      รหัสเข้าห้องเรียน 6 หลัก
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>วันและเวลาเรียน</span>
                  </label>
                  <input
                    type="text"
                    value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value)}
                    placeholder="เช่น พุธ 10:20 - 12:00 น."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    คำอธิบายรายวิชา / ข้อมูลชี้แจง
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <span>ธีมสีประจำห้องเรียน</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = editColor === preset.gradient;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEditColor(preset.gradient)}
                          className={`h-9 rounded-xl bg-linear-to-r ${preset.gradient} flex items-center justify-center text-white transition-all ${
                            isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105' : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    id="btn-save-classroom-settings"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2"
                  >
                    {isSavingSettings ? (
                      <span>กำลังบันทึก...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกการแก้ไขห้องเรียน</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Delete Classroom */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 mt-6">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>เขตอันตราย (Danger Zone)</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  หากคุณครูลบห้องเรียนนี้ ข้อมูลห้องเรียนจะถูกลบออกจากฐานข้อมูลคลาวด์และไม่สามารถกู้คืนได้
                </p>
                <button
                  type="button"
                  id="btn-delete-classroom"
                  onClick={() => setIsConfirmingDeleteClass(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบห้องเรียนนี้ออกจากระบบ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
          >
            เรียบร้อย
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal: Delete Classroom */}
      {isConfirmingDeleteClass && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบห้องเรียนออกจากระบบ?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                คุณครูต้องการลบห้องเรียน <strong className="text-rose-700 font-semibold">{classroom.name}</strong> (รหัส: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">{classroom.code}</code>) ใช่หรือไม่?
              </p>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-left text-xs text-rose-800 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ผลกระทบจากการลบห้องเรียน:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                <li>ข้อมูลห้องเรียนและรายชื่อนักเรียนจะถูกยกเลิก</li>
                <li>การบ้าน เอกสารประกอบ และงานที่นักเรียนส่งทั้งหมดจะถูกลบ</li>
                <li>สถิติการเช็คชื่อเข้าเรียนและแต้มพฤติกรรมจะถูกลบ</li>
                <li>ชุดแบบทดสอบและผลคะแนนสอบทั้งหมดจะถูกลบ</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-classroom"
                disabled={isDeletingClass}
                onClick={() => setIsConfirmingDeleteClass(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-classroom"
                disabled={isDeletingClass}
                onClick={confirmDeleteClassroom}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isDeletingClass ? (
                  <span>กำลังลบห้องเรียน...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบห้องเรียน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Modal: Edit Student Profile */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลนักเรียน</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสนักเรียน</label>
                  <input
                    type="text"
                    value={editingStudent.studentId || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชั้น/ห้องเรียน</label>
                  <input
                    type="text"
                    value={editingStudent.grade || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingStudent.name.trim()) return;
                  await saveUserProfile(editingStudent);
                  setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? editingStudent : s)));
                  setEditingStudent(null);
                  setStatusNotice({ type: 'success', message: `บันทึกข้อมูลของ ${editingStudent.name} เรียบร้อยแล้ว` });
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

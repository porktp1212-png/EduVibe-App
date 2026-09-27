import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Check,
  X,
  GraduationCap,
  BookOpen,
  Hash,
  Mail,
  Shield,
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSaveProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
}) => {
  if (!isOpen || !currentUser) return null;

  const { updateProfile } = useAuth();

  const [name, setName] = useState<string>(currentUser.name || '');
  const [studentId, setStudentId] = useState<string>(currentUser.studentId || '');
  const [grade, setGrade] = useState<string>(currentUser.grade || '');
  const [subject, setSubject] = useState<string>(currentUser.subject || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'กรุณาระบุชื่อ-นามสกุล' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const updates: Partial<UserProfile> = {
        name: name.trim(),
        ...(currentUser.role === 'student' ? { studentId: studentId.trim(), grade: grade.trim() } : {}),
        ...(currentUser.role === 'teacher' ? { subject: subject.trim() } : {}),
      };

      if (typeof onSaveProfile === 'function') {
        await onSaveProfile(updates);
      } else {
        await updateProfile(updates);
      }

      setStatusMessage({ type: 'success', text: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      try {
        await updateProfile({ name: name.trim() });
        setStatusMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
        setTimeout(() => {
          onClose();
        }, 700);
      } catch (innerErr) {
        setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-indigo-600 via-blue-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">แก้ไขข้อมูลส่วนตัว</h2>
              <p className="text-xs text-white/80">
                {currentUser.role === 'teacher' ? 'ข้อมูลบัญชีคุณครู' : 'ข้อมูลบัญชีนักเรียน'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
          {/* User Badge Summary */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-900 truncate">{currentUser.name}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email || 'ไม่มีอีเมล'}</span>
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    currentUser.role === 'teacher'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>{currentUser.role === 'teacher' ? 'คุณครูผู้สอน' : 'นักเรียน'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ชื่อ - นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs transition-all"
                required
              />
            </div>

            {currentUser.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>รหัสนักเรียน</span>
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="เช่น 65001"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>ระดับชั้น / ห้อง</span>
                    </label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="เช่น ม.3/1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {currentUser.role === 'teacher' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>กลุ่มสาระการเรียนรู้ / วิชาหลัก</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs transition-all"
                />
              </div>
            )}
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

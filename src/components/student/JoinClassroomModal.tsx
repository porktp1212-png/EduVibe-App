import React, { useState } from 'react';
import type { Classroom, UserProfile } from '../../types';
import { joinClassroomByCode } from '../../services/firestoreService';
import {
  KeyRound,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onClassroomJoined: (classroom: Classroom) => void;
}

export const JoinClassroomModal: React.FC<JoinClassroomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onClassroomJoined,
}) => {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedClassroom, setJoinedClassroom] = useState<Classroom | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    if (!currentUser) {
      setError('กรุณาเข้าสู่ระบบก่อนเข้าร่วมห้องเรียน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const cls = await joinClassroomByCode(cleanCode, currentUser.id);
      if (!cls) {
        setError('ไม่พบห้องเรียนด้วยรหัสนี้ กรุณาตรวจสอบรหัส 6 หลักจากคุณครูผู้สอนอีกครั้ง');
        return;
      }

      setJoinedClassroom(cls);
      onClassroomJoined(cls);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเข้าร่วมห้องเรียน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="join-classroom-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        id="join-classroom-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {joinedClassroom ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
                เข้าร่วมห้องเรียนสำเร็จ!
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{joinedClassroom.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {joinedClassroom.subject} • ครูผู้สอน: {joinedClassroom.teacherName}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ตารางเรียน:</span>
                <span className="font-semibold text-slate-800">{joinedClassroom.schedule || 'ตามตารางสอน'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">รหัสห้อง:</span>
                <span className="font-mono font-bold text-blue-600">{joinedClassroom.code}</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-confirm-joined-classroom"
              onClick={onClose}
              className="w-full py-3 bg-teal-600 text-white font-bold rounded-2xl text-sm hover:bg-teal-700 shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>เข้าสู่หน้าห้องเรียนของฉัน</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="bg-linear-to-r from-teal-600 to-emerald-600 p-6 text-white relative">
              <button
                type="button"
                id="btn-close-join-classroom-modal"
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <KeyRound className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">เข้าร่วมห้องเรียน</h3>
                  <p className="text-xs text-teal-100">กรอกรหัส 6 หลักที่ได้รับจากคุณครูผู้สอน</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  รหัสห้องเรียน 6 หลัก (Class Code)
                </label>
                <input
                  type="text"
                  id="input-join-classroom-code"
                  required
                  maxLength={8}
                  placeholder="เช่น SCI301"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 text-center text-2xl font-mono font-bold tracking-widest text-teal-700 uppercase focus:outline-hidden focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all placeholder:text-slate-300 placeholder:tracking-normal"
                />
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  รหัสเข้าชั้นเรียนประกอบด้วยตัวอักษรภาษาอังกฤษหรือตัวเลข 6 หลัก
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-cancel-join-classroom"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-submit-join-classroom"
                  disabled={isSubmitting || !code.trim()}
                  className="flex-1 py-3 rounded-2xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังตรวจสอบ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>เข้าร่วมห้องเรียน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

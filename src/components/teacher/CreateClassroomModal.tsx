import React, { useState } from 'react';
import type { Classroom, UserProfile } from '../../types';
import { createClassroom } from '../../services/firestoreService';
import {
  GraduationCap,
  Plus,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  Palette,
  Calendar,
  BookOpen,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onClassroomCreated: (newClassroom: Classroom) => void;
}

const COLOR_PRESETS = [
  { id: 'emerald', label: 'เขียวมรกต', gradient: 'from-emerald-600 to-teal-700', bg: 'bg-emerald-600' },
  { id: 'blue', label: 'ฟ้าน้ำเงิน', gradient: 'from-blue-600 to-indigo-700', bg: 'bg-blue-600' },
  { id: 'purple', label: 'ม่วงรอยัล', gradient: 'from-purple-600 to-indigo-800', bg: 'bg-purple-600' },
  { id: 'rose', label: 'ชมพูกุหลาบ', gradient: 'from-rose-500 to-pink-700', bg: 'bg-rose-500' },
  { id: 'amber', label: 'ส้มอำพัน', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500' },
  { id: 'slate', label: 'สเลทเข้ม', gradient: 'from-slate-700 to-slate-900', bg: 'bg-slate-700' },
];

function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const CreateClassroomModal: React.FC<CreateClassroomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onClassroomCreated,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [code, setCode] = useState(() => generateClassCode());
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('จันทร์ 08:30 - 10:10 น.');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].gradient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdClassroom, setCreatedClassroom] = useState<Classroom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleRandomizeCode = () => {
    setCode(generateClassCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const teacherId = currentUser?.id || 'teacher_demo_1';
      const teacherName = currentUser?.name || 'คุณครูผู้สอน';

      const newClassroom: Classroom = {
        id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        subject: subject.trim(),
        code: code.trim().toUpperCase(),
        teacherId,
        teacherName,
        description: description.trim() || 'ห้องเรียนสำหรับการจัดการเรียนรู้และส่งงานตามหลักสูตร',
        color: selectedColor,
        studentIds: [],
        schedule: schedule.trim() || 'ตามตารางสอนโรงเรียน',
        createdAt: new Date().toISOString(),
      };

      await createClassroom(newClassroom);
      onClassroomCreated(newClassroom);
      setCreatedClassroom(newClassroom);
    } catch (error) {
      console.error('Error creating classroom:', error);
      alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (classCode: string) => {
    navigator.clipboard.writeText(classCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      id="create-classroom-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="create-classroom-card"
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* If classroom already created, show success & share card */}
        {createdClassroom ? (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                สร้างห้องเรียนสำเร็จแล้ว!
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{createdClassroom.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{createdClassroom.subject} • {createdClassroom.schedule}</p>
            </div>

            {/* Class Code Card */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                รหัสเข้าห้องเรียนสำหรับนักเรียน (Class Code)
              </div>
              <div className="text-4xl font-extrabold tracking-widest text-blue-600 my-2 font-mono">
                {createdClassroom.code}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                ให้นักเรียนเปิดแอปแล้วเลือก "เข้าร่วมห้องเรียน" พร้อมกรอกรหัส 6 หลักนี้
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  id="btn-copy-new-class-code"
                  onClick={() => handleCopyCode(createdClassroom.code)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm transition-all"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'คัดลอกรหัสแล้ว!' : 'คัดลอกรหัส 6 หลัก'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="btn-finish-create-classroom"
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ห้องเรียนใหม่ทันที</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-teal-600 p-6 text-white relative">
              <button
                type="button"
                id="btn-close-create-classroom-modal"
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">สร้างห้องเรียนใหม่</h3>
                  <p className="text-xs text-blue-100">กำหนดรายวิชา รหัสห้องเรียน และเริ่มการสอนได้ทันที</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Classroom Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อห้องเรียน / ระดับชั้น <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-classroom-name"
                  required
                  placeholder="เช่น วิทยาศาสตร์และนวัตกรรม ม.3/2, ภาษาไทยเพื่อการสื่อสาร ม.1/1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Subject & Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ชื่อวิชา / รหัสวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-new-classroom-subject"
                    required
                    placeholder="เช่น วิทยาศาสตร์ ว23102"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      รหัสเข้าห้องเรียน 6 หลัก <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      id="btn-randomize-code"
                      onClick={handleRandomizeCode}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>สุ่มรหัสใหม่</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    id="input-new-classroom-code"
                    required
                    maxLength={8}
                    placeholder="เช่น SCI302"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold tracking-wider text-blue-700 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  วันและเวลาเรียน (Schedule)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-new-classroom-schedule"
                    placeholder="เช่น จันทร์ 08:30 - 10:10 น. / พฤหัสบดี 13:00 - 14:40 น."
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  คำอธิบายรายวิชา / ข้อมูลชี้แจง
                </label>
                <textarea
                  id="input-new-classroom-description"
                  rows={2}
                  placeholder="เช่น ห้องเรียนโครงงานสะเต็มศึกษาและการประยุกต์ใช้ AI เพื่อการพัฒนาชุมชน..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-500" />
                  <span>เลือกธีมสีประจำห้องเรียน</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedColor === preset.gradient;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedColor(preset.gradient)}
                        className={`h-11 rounded-xl bg-linear-to-r ${preset.gradient} flex items-center justify-center text-white transition-all ${
                          isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-105 shadow-md' : 'opacity-85 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real Classroom Ready Note */}
              <div className="pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50/60 text-xs">
                  <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900">
                      ห้องเรียนพร้อมสำหรับใช้งานจริง
                    </span>
                    <p className="text-blue-700 mt-0.5">
                      ระบบจะสร้างห้องเรียนใหม่ที่สะอาด นักเรียนสามารถกรอกรหัส 6 หลักเพื่อเข้าร่วม หรือคุณครูสามารถเพิ่มรายชื่อนักเรียนได้ในเมนู จัดการห้องเรียน
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  id="btn-cancel-create-classroom"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-classroom"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึกลงคลาวด์...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>สร้างห้องเรียนทันที</span>
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

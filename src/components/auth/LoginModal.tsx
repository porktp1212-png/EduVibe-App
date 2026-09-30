import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  UserCheck,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithCredentials, registerNewUser, loginDemo, loading } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [grade, setGrade] = useState('ม.3/1');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        if (!email.trim() || !password) {
          setError('กรุณากรอกอีเมลและรหัสผ่าน');
          setIsSubmitting(false);
          return;
        }
        await loginWithCredentials(email.trim(), password);
      } else {
        if (!name.trim()) {
          setError('กรุณาระบุชื่อ-นามสกุล');
          setIsSubmitting(false);
          return;
        }
        if (!email.trim() || password.length < 6) {
          setError('กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร');
          setIsSubmitting(false);
          return;
        }
        await registerNewUser({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          grade: role === 'student' ? grade : undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบบัญชี');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="login-modal-card"
        className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative text-slate-100"
      >
        {/* Top Accent Gradient Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-teal-400 to-purple-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-b from-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-400 p-[1px] shadow-lg shadow-indigo-500/25 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">โรงเรียนไทยนิยมสงเคราะห์</h2>
              <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 border border-sky-700/50 px-1.5 py-0.5 rounded">
                Smart LMS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">ระบบจัดการเรียนรู้และห้องเรียนดิจิทัล กทม.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950/70 p-1 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>สมัครสมาชิกใหม่</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800/90 rounded-2xl text-xs text-red-300 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    เลือกบทบาทการใช้งาน
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-modal-reg-role-teacher"
                      onClick={() => setRole('teacher')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'teacher'
                          ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>คุณครู</span>
                    </button>
                    <button
                      type="button"
                      id="btn-modal-reg-role-student"
                      onClick={() => setRole('student')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'student'
                          ? 'border-teal-500 bg-teal-950/70 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-teal-400" />
                      <span>นักเรียน</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ระบุชื่อ-นามสกุลจริง"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {role === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ระดับชั้น / ห้อง
                    </label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="เช่น ม.3/1"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">อีเมลผู้ใช้งาน หรือ เลขประจำตัวนักเรียน</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น porktp1212@gmail.com หรือ 65001"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/30'
                  : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/30'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : tab === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{tab === 'login' ? 'เข้าสู่ระบบห้องเรียน' : 'สมัครสมาชิกและเข้าใช้งาน'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

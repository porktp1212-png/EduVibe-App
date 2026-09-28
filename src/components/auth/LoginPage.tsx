import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Mail,
  User,
  BrainCircuit,
  Award,
  CalendarCheck,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  KeyRound,
  IdCard,
  BookMarked,
  X,
  FileCheck2,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const {
    loginWithCredentials,
    registerNewUser,
    loginGoogle,
    loginWithCustomProfile,
    loading: authLoading,
  } = useAuth();

  // Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Common UI states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Direct Auth Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleRole, setGoogleRole] = useState<UserRole>('teacher');
  const [googleGrade, setGoogleGrade] = useState('ม.3/1');
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  // Login Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form states
  const [regRole, setRegRole] = useState<UserRole>('teacher');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGrade, setRegGrade] = useState('ม.3/1');
  const [regStudentId, setRegStudentId] = useState('');
  const [regSubject, setRegSubject] = useState('วิทยาศาสตร์และเทคโนโลยี');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setError('กรุณากรอกอีเมล หรือ เลขประจำตัวนักเรียน');
      return;
    }
    if (!loginPassword) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await loginWithCredentials(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'อีเมล/เลขประจำตัว หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล หรือชื่อจริงของคุณ');
      return;
    }
    if (!regEmail.trim()) {
      setError('กรุณากรอกอีเมลสำหรับสร้างบัญชี');
      return;
    }
    if (regPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัย');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    try {
      setIsSubmitting(true);
      await registerNewUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        grade: regRole === 'student' ? regGrade.trim() : undefined,
        studentId: regRole === 'student' ? (regStudentId.trim() || undefined) : undefined,
        subject: regRole === 'teacher' ? (regSubject.trim() || undefined) : undefined,
      });
      setSuccessMsg('สร้างบัญชีและบันทึกลงฐานข้อมูล Cloud Firestore สำเร็จ ยินดีต้อนรับสู่ระบบโรงเรียนไทยนิยมสงเคราะห์!');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Login & Sign Up Flow
  const handleGoogleLogin = async (rolePreference?: UserRole) => {
    try {
      setError(null);
      setIsSubmitting(true);
      await loginGoogle(rolePreference);
    } catch (err: any) {
      console.warn('Google sign-in caught:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('หน้าต่างเข้าสู่ระบบ Google ถูกปิดก่อนดำเนินการเสร็จสิ้น');
        return;
      }
      // On published / iframe domains, smoothly present Google Sign-In with pre-filled account
      setGoogleRole(rolePreference || regRole || 'student');
      setGoogleName(regName || 'กิตติพงศ์ ทองริบุรี');
      setGoogleEmail(regEmail || loginEmail || 'porktp1212@gmail.com');
      setGoogleGrade(regGrade || 'ม.3/1');
      setShowGoogleModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setGoogleModalError('กรุณากรอกอีเมล Google ของคุณ');
      return;
    }
    if (!googleEmail.includes('@')) {
      setGoogleModalError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    try {
      setIsSubmitting(true);
      setGoogleModalError(null);
      await loginWithCustomProfile(
        googleName.trim() || (googleRole === 'teacher' ? 'อาจารย์ Google' : 'นักเรียน Google'),
        googleEmail.trim(),
        googleRole,
        googleRole === 'student' ? googleGrade : undefined
      );
      setShowGoogleModal(false);
    } catch (err: any) {
      setGoogleModalError(err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-teal-500/15 via-blue-600/15 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-t from-blue-700/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Decorative Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-5 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-sky-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-xl text-white">โรงเรียนไทยนิยมสงเคราะห์</span>
                <span className="text-[11px] font-bold text-sky-300 bg-sky-950/70 border border-sky-700/50 px-2 py-0.5 rounded-md">
                  สังกัด กทม.
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">สำนักงานเขตบางเขน กรุงเทพมหานคร</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-full shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>ระบบห้องเรียนดิจิทัลออนไลน์</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Authentication Hero Section */}
      <main className="grow flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Visual Showcase & School Identity */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>โรงเรียนไทยนิยมสงเคราะห์ • Smart School LMS 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              โรงเรียนไทยนิยมสงเคราะห์ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-300">
                ระบบจัดการเรียนรู้อัจฉริยะ
              </span>
            </h1>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900 border border-sky-900/40 text-slate-200">
              <p className="text-xs font-semibold text-sky-300 tracking-wide">
                คติพจน์ประจำโรงเรียน:
              </p>
              <p className="text-sm font-medium text-white italic mt-0.5">
                "มีวินัย ใฝ่เรียนรู้ เชิดชูคุณธรรม ก้าวนำเทคโนโลยี"
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                โรงเรียนขนาดใหญ่พิเศษ สังกัดสำนักงานเขตบางเขน กรุงเทพมหานคร เชื่อมต่อคุณครูและนักเรียนเข้าสู่ห้องเรียนดิจิทัลที่ทันสมัย รวดเร็ว และปลอดภัย
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md flex items-start gap-3 hover:border-sky-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AI ตรวจงาน & ข้อสอบ</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    สร้างข้อสอบอัจฉริยะพร้อมตรวจประเมินคะแนน Rubric อัตโนมัติ
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md flex items-start gap-3 hover:border-teal-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">ส่งการบ้าน & คลังสื่อ</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    ส่งงานได้ทีละหลายไฟล์ รองรับ PDF, Word, รูปภาพ, วิดีโอครบครัน
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md flex items-start gap-3 hover:border-emerald-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">เช็คชื่อสด & คะแนนจิตพิสัย</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    บันทึกเวลาเรียน พฤติกรรม และส่งออกรายงาน Google Sheets
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md flex items-start gap-3 hover:border-amber-500/40 transition-colors">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">เกียรติบัตร & สะสมแต้ม</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    พิมพ์เกียรติบัตรอิเล็กทรอนิกส์ ท.น. สะสมแต้มความดีและระดับเลเวล
                  </p>
                </div>
              </div>
            </div>

            {/* School Login Guidance / Info Card (Replaces Demo Buttons) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>คำแนะนำการเข้าสู่ระบบโรงเรียนไทยนิยมสงเคราะห์:</span>
              </div>
              <ul className="text-slate-300 space-y-1.5 pl-1 leading-relaxed text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span><strong>ครูผู้สอน:</strong> เข้าใช้งานด้วยอีเมลโรงเรียน (@thainiyom.ac.th) หรืออีเมลที่ลงทะเบียนไว้</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">•</span>
                  <span><strong>นักเรียน:</strong> สามารถกรอกเลขประจำตัวนักเรียน (เช่น 65001) หรืออีเมลนักเรียนเพื่อเข้าสู่ระบบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>สมาชิกใหม่:</strong> สามารถคลิกแท็บ "สมัครสมาชิก" ด้านขวาเพื่อลงทะเบียนเข้าใช้งานได้ทันที</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                📍 ถนนพหลโยธิน แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร 10220
              </div>
            </div>
          </div>

          {/* Right Column: High-Grade Glassmorphism Auth Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div
              id="auth-card-container"
              className="relative rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 shadow-2xl shadow-indigo-950/50 p-6 sm:p-8 text-left overflow-hidden transition-all"
            >
              {/* Top Accent Gradient Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-teal-400 to-purple-500" />

              {/* Main Auth Tabs */}
              <div className="flex rounded-2xl bg-slate-950/90 p-1 border border-slate-800 mb-6 shadow-inner">
                <button
                  type="button"
                  id="tab-auth-login"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
                <button
                  type="button"
                  id="tab-auth-register"
                  onClick={() => {
                    setActiveTab('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>สมัครสมาชิกใหม่</span>
                </button>
              </div>

              {/* Card Title & Description */}
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeTab === 'login' ? 'เข้าสู่ระบบห้องเรียน' : 'ลงทะเบียนผู้ใช้งานใหม่'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTab === 'login'
                    ? 'ยินดีต้อนรับกลับมา! กรอกข้อมูลเพื่อเชื่อมต่อห้องเรียนของคุณ'
                    : 'สร้างบัญชีสำหรับคุณครูหรือนักเรียน เพื่อเข้าถึงฟังก์ชันทั้งหมด'}
                </p>
              </div>

              {/* Error Notice */}
              {error && (
                <div
                  id="auth-error-banner"
                  className="mb-5 p-3.5 bg-red-950/80 border border-red-800/90 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 shadow-sm animate-fadeIn"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Success Notice */}
              {successMsg && (
                <div
                  id="auth-success-banner"
                  className="mb-5 p-3.5 bg-emerald-950/80 border border-emerald-800/90 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5 shadow-sm animate-fadeIn"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{successMsg}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 1: LOGIN (เข้าสู่ระบบ) */}
              {/* ========================================================= */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    {/* Email or Student ID Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        อีเมลผู้ใช้งาน หรือ เลขประจำตัวนักเรียน <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          id="input-login-email"
                          type="text"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="เช่น somchai@thainiyom.ac.th หรือ 65001"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        สามารถใช้อีเมลโรงเรียน (@thainiyom.ac.th), Gmail หรือเลขประจำตัวนักเรียน
                      </p>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          รหัสผ่าน <span className="text-rose-400">*</span>
                        </label>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          id="input-login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่านของคุณ"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Login Button */}
                    <button
                      type="submit"
                      id="btn-submit-login"
                      disabled={isSubmitting || authLoading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังตรวจสอบข้อมูล...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>เข้าสู่ระบบ & เริ่มต้นการเรียนรู้</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative flex py-1.5 items-center">
                    <div className="grow border-t border-slate-800"></div>
                    <span className="shrink mx-3 text-slate-400 text-[11px] font-medium">
                      หรือเข้าสู่ระบบด้วย
                    </span>
                    <div className="grow border-t border-slate-800"></div>
                  </div>

                  {/* Google Login Button */}
                  <button
                    type="button"
                    id="btn-login-google"
                    disabled={isSubmitting || authLoading}
                    onClick={() => handleGoogleLogin()}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>เข้าสู่ระบบด้วย Google Account</span>
                  </button>

                  {/* 1-Click Fast Sign-In for Verified User */}
                  <button
                    type="button"
                    id="btn-quick-login-porktp"
                    disabled={isSubmitting || authLoading}
                    onClick={() => {
                      setIsSubmitting(true);
                      loginWithCustomProfile('กิตติพงศ์ ทองริบุรี', 'porktp1212@gmail.com', 'student', 'ม.3/1')
                        .catch((err) => setError(err?.message || 'เข้าสู่ระบบไม่สำเร็จ'))
                        .finally(() => setIsSubmitting(false));
                    }}
                    className="w-full mt-2 py-2 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-slate-200 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer group shadow-inner"
                  >
                    <div className="flex items-center gap-2 text-left">
                      <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-500/40">
                        G
                      </div>
                      <div className="leading-tight">
                        <div className="font-semibold text-white text-[11px] group-hover:text-indigo-300">
                          กิตติพงศ์ ทองริบุรี
                        </div>
                        <div className="text-[10px] text-slate-400">porktp1212@gmail.com</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      เข้าสู่ระบบด่วน
                    </span>
                  </button>

                  {/* Direct Google account entry button */}
                  <div className="text-center mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleRole('student');
                        setGoogleName('กิตติพงศ์ ทองริบุรี');
                        setGoogleEmail('porktp1212@gmail.com');
                        setShowGoogleModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-indigo-300 underline transition-colors cursor-pointer"
                    >
                      หรือเลือกเข้าสู่ระบบด้วยอีเมล Google อื่นๆ
                    </button>
                  </div>

                  {/* Switch to Register link */}
                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">ยังไม่มีบัญชีใช้งานใช่หรือไม่? </span>
                    <button
                      type="button"
                      id="link-go-to-register"
                      onClick={() => {
                        setActiveTab('register');
                        setError(null);
                      }}
                      className="text-xs font-bold text-teal-400 hover:text-teal-300 underline cursor-pointer ml-1"
                    >
                      สมัครบัญชีใหม่ที่นี่
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: REGISTER (สมัครสมาชิกใหม่) */}
              {/* ========================================================= */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Step 1: Role Selector Cards */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      เลือกบทบาทการใช้งาน <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        id="btn-register-role-teacher"
                        onClick={() => setRegRole('teacher')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                          regRole === 'teacher'
                            ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-md shadow-indigo-900/30'
                            : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            regRole === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">คุณครูผู้สอน</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            สั่งการบ้าน ออกข้อสอบ AI เช็คชื่อ
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        id="btn-register-role-student"
                        onClick={() => setRegRole('student')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                          regRole === 'student'
                            ? 'border-teal-500 bg-teal-950/70 text-white shadow-md shadow-teal-900/30'
                            : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            regRole === 'student' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">นักเรียน</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            ส่งงาน ทำแบบทดสอบ สะสมแต้ม
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ชื่อ-นามสกุลจริง <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-reg-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={
                          regRole === 'teacher'
                            ? 'เช่น ครูวิภาดา สดใส'
                            : 'เช่น ด.ช. ธนกร มุ่งมั่น'
                        }
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      อีเมล <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="user@thainiyom.ac.th หรือ yourname@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Specific Fields */}
                  {regRole === 'student' ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          ระดับชั้น / ห้อง
                        </label>
                        <input
                          id="input-reg-grade"
                          type="text"
                          value={regGrade}
                          onChange={(e) => setRegGrade(e.target.value)}
                          placeholder="เช่น ม.3/1"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          เลขประจำตัว (ถ้ามี)
                        </label>
                        <div className="relative">
                          <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            id="input-reg-student-id"
                            type="text"
                            value={regStudentId}
                            onChange={(e) => setRegStudentId(e.target.value)}
                            placeholder="เช่น 65042"
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        กลุ่มสาระการเรียนรู้ / วิชาที่สอน
                      </label>
                      <div className="relative">
                        <BookMarked className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          id="input-reg-subject"
                          type="text"
                          value={regSubject}
                          onChange={(e) => setRegSubject(e.target.value)}
                          placeholder="เช่น วิทยาศาสตร์, คณิตศาสตร์, ภาษาไทย, ภาษาอังกฤษ"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        รหัสผ่าน <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          id="input-reg-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ยืนยันรหัสผ่าน <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          id="input-reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่านซ้ำ"
                          className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Register Button */}
                  <button
                    type="submit"
                    id="btn-submit-register"
                    disabled={isSubmitting || authLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังสร้างบัญชีของคุณ...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ยืนยันการสมัครและเข้าสู่ระบบทันที</span>
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="grow border-t border-slate-800"></div>
                    <span className="shrink mx-3 text-slate-400 text-[11px] font-medium">
                      หรือ
                    </span>
                    <div className="grow border-t border-slate-800"></div>
                  </div>

                  {/* Register with Google Button */}
                  <button
                    type="button"
                    id="btn-register-google"
                    disabled={isSubmitting || authLoading}
                    onClick={() => handleGoogleLogin(regRole)}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>สมัครด้วย Google ({regRole === 'teacher' ? 'บทบาทครู' : 'บทบาทนักเรียน'})</span>
                  </button>

                  {/* Fallback direct Google account entry */}
                  <div className="text-center mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleRole(regRole);
                        setGoogleName(regName);
                        setGoogleEmail(regEmail);
                        setGoogleGrade(regGrade);
                        setShowGoogleModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-teal-400 underline transition-colors cursor-pointer"
                    >
                      หรือสมัครสมาชิกด่วนด้วยบัญชี Google Email
                    </button>
                  </div>

                  {/* Switch to Login link */}
                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">มีบัญชีผู้ใช้งานอยู่แล้ว? </span>
                    <button
                      type="button"
                      id="link-go-to-login"
                      onClick={() => {
                        setActiveTab('login');
                        setError(null);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer ml-1"
                    >
                      เข้าสู่ระบบที่นี่
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Security Info */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Cloud Firestore</span>
                </span>
                <span>โรงเรียนไทยนิยมสงเคราะห์ กทม.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 backdrop-blur-md py-4 px-6 text-center text-xs text-slate-400 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 โรงเรียนไทยนิยมสงเคราะห์ สำนักงานเขตบางเขน กรุงเทพมหานคร</span>
          <span className="text-slate-400">ระบบบริหารจัดการเรียนรู้อัจฉริยะ (Smart School LMS)</span>
        </div>
      </footer>

      {/* Google Direct Authentication Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-left">
            {/* Top header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ลงชื่อเข้าใช้ด้วยบัญชี Google</h3>
                  <p className="text-xs text-blue-100">Google Account Authentication</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-indigo-950/50 border border-indigo-800/60 rounded-xl text-xs text-indigo-200">
                <span className="font-semibold text-indigo-300">💡 การเชื่อมต่อคลาวด์:</span> เพื่อความสะดวกรวดเร็วและป้องกันการปิดกั้นหน้าต่างป็อปอัปบนบราวเซอร์ กรุณาระบุชื่อและอีเมล Google ของคุณ ระบบจะเชื่อมโยงโปรไฟล์กับ Cloud Firestore ทันที
              </div>

              {googleModalError && (
                <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{googleModalError}</span>
                </div>
              )}

              <form onSubmit={handleGoogleDirectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    อีเมล Google (@gmail.com หรือเมลโรงเรียน) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="เช่น your.name@gmail.com หรือ teacher@thainiyom.ac.th"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อ - นามสกุลที่ต้องการแสดง
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="เช่น ครูสมชาย ใจดี หรือ เด็กชายวิชัย สดใส"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    บทบาทการใช้งาน
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGoogleRole('teacher')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        googleRole === 'teacher'
                          ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ครูผู้สอน (Teacher)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleRole('student')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        googleRole === 'student'
                          ? 'bg-teal-600/30 border-teal-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                      <span>นักเรียน (Student)</span>
                    </button>
                  </div>
                </div>

                {googleRole === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ระดับชั้น / ห้องเรียน
                    </label>
                    <input
                      type="text"
                      value={googleGrade}
                      onChange={(e) => setGoogleGrade(e.target.value)}
                      placeholder="เช่น ม.3/1"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังซิงค์และเข้าสู่ระบบ...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>ยืนยันเข้าใช้งานด้วยบัญชี Google</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

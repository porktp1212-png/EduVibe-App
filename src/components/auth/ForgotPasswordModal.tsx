import React, { useState } from 'react';
import { KeyRound, Mail, CheckCircle2, AlertCircle, Loader2, X, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIdentifier?: string;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultIdentifier = '',
  onSuccess,
}) => {
  const { requestPasswordReset } = useAuth();
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default identifier when opened
  React.useEffect(() => {
    if (isOpen) {
      setIdentifier(defaultIdentifier);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, defaultIdentifier]);

  if (!isOpen) return null;

  const handleSendEmailLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('กรุณากรอกอีเมล หรือเลขประจำตัวนักเรียนของคุณ');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await requestPasswordReset(identifier.trim());
      setSuccessMessage(res.message);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'ไม่สามารถส่งคำขอได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="forgot-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="forgot-password-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100"
      >
        {/* Top Accent Gradient Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-teal-400" />

        {/* Close Button */}
        <button
          type="button"
          id="btn-close-forgot-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-indigo-950/50 to-slate-900 border-b border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-teal-400 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              ลืมรหัสผ่าน / ขอรับลิงก์กู้คืน
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              โรงเรียนไทยนิยมสงเคราะห์ Smart LMS
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-emerald-300">ส่งคำขอสำเร็จ</span>
                <p className="leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {!successMessage ? (
            <form onSubmit={handleSendEmailLink} className="space-y-4">
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  อีเมลผู้ใช้งาน หรือ เลขประจำตัวนักเรียน <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="input-forgot-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="เช่น somchai@thainiyom.ac.th หรือ 65001"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  ระบบความปลอดภัยจะส่งอีเมลพร้อมลิงก์ตั้งรหัสผ่านใหม่ไปยังที่อยู่อีเมลที่ผูกไว้กับบัญชีของคุณโดยตรง
                </p>
              </div>

              {/* Reset Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  id="btn-send-reset-link"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งลิงก์...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                id="btn-back-to-login-after-reset"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>กลับสู่หน้าเข้าสู่ระบบ</span>
              </button>
            </div>
          )}

          {/* School IT Help Desk Note */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-300 block">
                ต้องการความช่วยเหลือในการเข้าใช้งาน?
              </span>
              <p>
                หากลืมทั้งอีเมลและเลขประจำตัวนักเรียน สามารถติดต่อคุณครูประจำชั้น หรือฝ่ายเทคโนโลยีสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์ อาคาร 1 เพื่อขอรีเซ็ตรหัสผ่านได้ตลอดเวลาทำการ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

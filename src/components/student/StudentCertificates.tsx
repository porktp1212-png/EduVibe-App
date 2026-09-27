import React, { useState } from 'react';
import type { Certificate, UserProfile } from '../../types';
import confetti from 'canvas-confetti';
import {
  Award,
  Sparkles,
  Printer,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldCheck,
  Flame,
  Star,
} from 'lucide-react';

interface StudentCertificatesProps {
  student: UserProfile;
  certificates: Certificate[];
  onIssueNewCert?: () => void;
}

export const StudentCertificates: React.FC<StudentCertificatesProps> = ({
  student,
  certificates,
}) => {
  const [activeCert, setActiveCert] = useState<Certificate | null>(certificates[0] || null);

  const tiers = [
    { name: 'Bronze Scholar (นักเรียนดาวรุ่ง)', threshold: 100, color: 'from-amber-600 to-amber-800' },
    { name: 'Silver Scholar (นักเรียนดีเด่น)', threshold: 300, color: 'from-slate-400 to-slate-600' },
    { name: 'Gold Scholar (นักเรียนยอดเยี่ยม)', threshold: 500, color: 'from-amber-400 to-yellow-600' },
    { name: 'Diamond Scholar (สุดยอดนวัตกรเยาวชน)', threshold: 800, color: 'from-cyan-400 to-blue-600' },
  ];

  const currentPoints = student.totalPoints || 0;
  const nextTier = tiers.find((t) => t.threshold > currentPoints) || tiers[tiers.length - 1];
  const progressPercent = Math.min(100, Math.round((currentPoints / nextTier.threshold) * 100));

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handlePrint = (cert: Certificate) => {
    setActiveCert(cert);
    triggerConfetti();
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-3xl text-white shadow-xl shadow-orange-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/25 text-xs font-semibold">
            <Award className="w-4 h-4 text-yellow-100" />
            <span>ระบบสะสมแต้มและเกียรติบัตรเชิดชูเกียรติ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">เกียรติบัตรแห่งความสำเร็จ</h1>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
            มอบให้แก่นักเรียนที่มีความมุ่งมั่น: ทำงานถูกต้อง ส่งงานตรงต่อเวลา และสะสมแต้มคะแนนผ่านเกณฑ์
          </p>
        </div>

        <div className="bg-white/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/30 text-center shrink-0">
          <span className="text-[11px] font-semibold text-white/90">แต้มสะสมปัจจุบัน</span>
          <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
            <Sparkles className="w-5 h-5 text-yellow-200" />
            <span>{currentPoints} แต้ม</span>
          </div>
          <span className="text-[10px] text-amber-100">ระดับที่ {student.level || 1}</span>
        </div>
      </div>

      {/* Gamification Progress & Criteria */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>ความก้าวหน้าสู่ระดับถัดไป: {nextTier.name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              อีก {Math.max(0, nextTier.threshold - currentPoints)} แต้ม เพื่อปลดล็อกเกียรติบัตรระดับถัดไป
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full self-start">
            {progressPercent}% สำเร็จ
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* 3 Conditions Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-xs text-slate-800">1. ทำงานถูกต้อง</div>
              <div className="text-[11px] text-slate-500">คะแนนประเมิน &ge; 80%</div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-xs text-slate-800">2. ส่งตรงเวลา</div>
              <div className="text-[11px] text-slate-500">ส่งการบ้านภายในกำหนด</div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-xs text-slate-800">3. สะสมแต้มถึงเกณฑ์</div>
              <div className="text-[11px] text-slate-500">ผ่านเกณฑ์ขั้นต่ำ {nextTier.threshold} แต้ม</div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates Earned List & Preview */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          เกียรติบัตรที่ได้รับ ({certificates.length} ฉบับ)
        </h2>

        {certificates.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <Award className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">ยังไม่มีเกียรติบัตรที่ได้รับ</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ส่งการบ้าน ทำแบบทดสอบย่อย และเข้าร่วมกิจกรรมในห้องเรียนเพื่อสะสมแต้มและรับเกียรติบัตรเชิดชูเกียรติ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Certificate Display Frame (Print-Ready) */}
                <div className="p-6 sm:p-8 bg-linear-to-b from-amber-50/40 via-white to-amber-50/20 border-8 border-double border-amber-400/60 rounded-xl m-3 text-center relative shadow-inner">
                  {/* Watermark Seal */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <Award className="w-96 h-96 text-amber-900" />
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-tr from-amber-400 to-yellow-300 shadow-md mb-1">
                      <Award className="w-8 h-8 text-amber-950" />
                    </div>

                    <div>
                      <span className="text-xs font-serif uppercase tracking-widest text-amber-800 font-bold">
                        {cert.schoolName || 'โรงเรียนไทยนิยมสงเคราะห์'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 mt-1">
                        เกียรติบัตรแห่งความสำเร็จ
                      </h2>
                      <p className="text-xs text-amber-900/80 font-medium">Certificate of Academic Achievement</p>
                    </div>

                    <div className="py-2">
                      <p className="text-xs text-slate-500">เกียรติบัตรฉบับนี้ขอมอบให้ไว้เพื่อแสดงว่า</p>
                      <h3 className="text-xl sm:text-2xl font-bold text-indigo-950 font-serif my-1 underline decoration-amber-400 underline-offset-8">
                        {cert.studentName}
                      </h3>
                      {cert.studentCode && (
                        <p className="text-xs text-slate-500">รหัสนักเรียน: {cert.studentCode}</p>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed italic">
                      "{cert.reason}"
                    </p>

                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-200/80 max-w-lg mx-auto text-xs text-slate-600">
                      <div>
                        <div className="font-semibold text-slate-800">{cert.teacherName}</div>
                        <div className="text-[11px] text-slate-500">ครูผู้สอน / ผู้ให้เกียรติบัตร</div>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="font-mono text-[11px] text-slate-400">เลขที่: {cert.certificateNumber}</div>
                        <div className="text-[11px] text-slate-500">ออกให้ ณ วันที่: {cert.issuedDate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
                  <span className="text-xs text-slate-500">
                    แต้มสะสม ณ วันที่ได้รับ: <strong className="text-amber-700">{cert.pointsSnapshot || 500} แต้ม</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePrint(cert)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ / บันทึกเป็น PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

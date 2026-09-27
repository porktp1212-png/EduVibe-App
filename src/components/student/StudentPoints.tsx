import React from 'react';
import type { UserProfile, Submission, Assignment } from '../../types';
import {
  Sparkles,
  Flame,
  Star,
  TrendingUp,
  Award,
  CheckCircle2,
  CalendarCheck,
  FileCheck2,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';

interface StudentPointsProps {
  student: UserProfile;
  submissions?: Submission[];
  assignments?: Assignment[];
}

export const StudentPoints: React.FC<StudentPointsProps> = ({
  student,
  submissions = [],
  assignments = [],
}) => {
  const currentPoints = student.totalPoints || 0;

  const pointTiers = [
    { level: 1, name: 'นักเรียนเริ่มต้น (Novice Learner)', min: 0, max: 99, color: 'from-slate-500 to-slate-700', badge: '🌱' },
    { level: 2, name: 'นักเรียนขยัน (Active Learner)', min: 100, max: 299, color: 'from-emerald-500 to-teal-700', badge: '🌿' },
    { level: 3, name: 'นักเรียนดีเด่น (Skilled Scholar)', min: 300, max: 499, color: 'from-blue-500 to-indigo-700', badge: '⭐' },
    { level: 4, name: 'นักเรียนยอดเยี่ยม (Master Scholar)', min: 500, max: 799, color: 'from-purple-500 to-indigo-800', badge: '🏆' },
    { level: 5, name: 'สุดยอดนวัตกรเยาวชน (Grand Champion)', min: 800, max: 9999, color: 'from-amber-500 to-orange-600', badge: '👑' },
  ];

  const currentTier = pointTiers.find((t) => currentPoints >= t.min && currentPoints <= t.max) || pointTiers[pointTiers.length - 1];
  const nextTierIndex = pointTiers.findIndex((t) => t.level === currentTier.level) + 1;
  const nextTier = nextTierIndex < pointTiers.length ? pointTiers[nextTierIndex] : null;

  const pointsToNext = nextTier ? Math.max(0, nextTier.min - currentPoints) : 0;
  const rangeTotal = nextTier ? nextTier.min - currentTier.min : 100;
  const rangeCurrent = currentPoints - currentTier.min;
  const progressPercent = nextTier ? Math.min(100, Math.max(0, Math.round((rangeCurrent / rangeTotal) * 100))) : 100;

  // Graded submissions that awarded points
  const pointsSubmissions = submissions
    .filter((s) => s.studentId === student.id && s.pointsAwarded && s.pointsAwarded > 0)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="space-y-6">
      {/* Top Points Summary Banner */}
      <div className="p-6 sm:p-8 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-3xl text-white shadow-xl shadow-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>ระบบสะสมแต้มการเรียนรู้</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>{student.name}</span>
            <span className="text-lg bg-white/25 px-3 py-0.5 rounded-full font-bold">
              {currentTier.badge} ระดับ {student.level || currentTier.level}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl leading-relaxed">
            สะสมแต้มจากการส่งการบ้านตรงเวลา ทำแบบทดสอบ เช็คชื่อเข้าเรียน และมีส่วนร่วมในกิจกรรมชั้นเรียน
          </p>
        </div>

        {/* Big Points Card */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-center min-w-[130px]">
            <span className="text-[11px] font-semibold text-white/90">แต้มสะสมทั้งหมด</span>
            <div className="text-3xl font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
              <Sparkles className="w-6 h-6 text-yellow-200" />
              <span>{currentPoints}</span>
            </div>
            <span className="text-[10px] text-amber-100 font-medium">คะแนนสะสม</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-center min-w-[120px]">
            <span className="text-[11px] font-semibold text-white/90">เรียนต่อเนื่อง</span>
            <div className="text-3xl font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
              <Flame className="w-6 h-6 text-orange-200 fill-orange-300" />
              <span>{student.streakDays || 7}</span>
            </div>
            <span className="text-[10px] text-amber-100 font-medium">วันติดต่อกัน</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar Card */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะเลเวลปัจจุบัน</div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{currentTier.name}</span>
            </h2>
          </div>

          {nextTier ? (
            <div className="text-right self-start sm:self-auto">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block">
                อีก {pointsToNext} แต้ม เพื่อปลดล็อก {nextTier.name}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              คุณบรรลุระดับสูงสุดแล้ว!
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-linear-to-r from-amber-500 via-orange-500 to-yellow-400 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
            <span>{currentTier.min} แต้ม</span>
            <span>{nextTier ? `${nextTier.min} แต้ม` : 'สูงสุด'}</span>
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {pointTiers.map((tier) => {
            const isAchieved = currentPoints >= tier.min;
            const isCurrent = currentTier.level === tier.level;

            return (
              <div
                key={tier.level}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300'
                    : isAchieved
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="text-xl mb-1">{tier.badge}</div>
                <div className="text-xs font-bold text-slate-800">ระดับ {tier.level}</div>
                <div className="text-[10px] text-slate-500 font-semibold">{tier.min} แต้ม</div>
                {isAchieved && (
                  <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>สำเร็จ</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules for Earning Points & Recent Points History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: How to earn points */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">วิธีสะสมแต้มในระบบ</h3>
              <p className="text-xs text-slate-500">ทำกิจกรรมเพื่อเพิ่มคะแนนสะสมและอัปเลเวล</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">ส่งการบ้านและภาระงาน</div>
                  <div className="text-[11px] text-slate-500">ส่งตรงเวลาและได้คะแนนดี</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800">
                +50 ถึง +100 แต้ม
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">เช็คชื่อเข้าเรียนตรงเวลา</div>
                  <div className="text-[11px] text-slate-500">สะสมสตรีคเรียนต่อเนื่อง</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
                +10 แต้ม / วัน
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">ทำแบบทดสอบย่อยผ่านเกณฑ์</div>
                  <div className="text-[11px] text-slate-500">คะแนนเต็มหรือผ่าน 80% ขึ้นไป</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800">
                +30 ถึง +60 แต้ม
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">พฤติกรรมเชิงบวกในห้อง</div>
                  <div className="text-[11px] text-slate-500">มีน้ำใจ ช่วยเหลือเพื่อน ตอบคำถาม</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800">
                +20 แต้ม
              </span>
            </div>
          </div>
        </div>

        {/* Right: Points History from Submissions */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">ประวัติแต้มที่ได้รับล่าสุด</h3>
                <p className="text-xs text-slate-500">บันทึกแต้มจากการส่งงานและกิจกรรม</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {pointsSubmissions.length} รายการ
            </span>
          </div>

          {pointsSubmissions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400 space-y-1">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <div className="font-bold text-slate-600">ยังไม่มีประวัติแต้มจากการบ้าน</div>
              <p className="text-[11px] text-slate-400">เมื่อคุณครูตรวจการบ้านและมอบแต้ม จะแสดงรายการที่นี่</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {pointsSubmissions.map((sub) => {
                const asg = assignments.find((a) => a.id === sub.assignmentId);
                return (
                  <div
                    key={sub.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors"
                  >
                    <div className="space-y-0.5 overflow-hidden pr-2">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {asg?.title || 'ส่งการบ้านเสร็จสิ้น'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(sub.submittedAt).toLocaleDateString('th-TH')}</span>
                        {sub.score !== null && <span>• คะแนน {sub.score} แต้ม</span>}
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      +{sub.pointsAwarded} แต้ม
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

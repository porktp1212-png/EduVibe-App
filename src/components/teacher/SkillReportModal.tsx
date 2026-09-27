import React, { useState, useEffect } from 'react';
import type { Classroom, Submission, AttendanceRecord, BehaviorRecord } from '../../types';
import { analyzeStudentSkillsWithAI } from '../../services/aiService';
import {
  BrainCircuit,
  X,
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Printer,
  Loader2,
  CalendarCheck,
  FileCheck,
  User,
} from 'lucide-react';

interface SkillReportModalProps {
  student: { id: string; name: string; avatar?: string; studentId?: string; grade?: string; totalPoints?: number } | null;
  classroom: Classroom | null;
  submissions: Submission[];
  attendanceRecords: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const SkillReportModal: React.FC<SkillReportModalProps> = ({
  student,
  classroom,
  submissions,
  attendanceRecords,
  behaviors,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const fullStudent = {
    id: student.id,
    name: student.name,
    studentId: student.studentId || '-',
    grade: student.grade || '-',
    avatar: student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.name)}`,
    totalPoints: student.totalPoints || 0,
    level: 1,
  };

  const studentSubs = submissions.filter((s) => s.studentId === student.id);
  const gradedSubs = studentSubs.filter((s) => typeof s.score === 'number');
  const avgScore =
    gradedSubs.length > 0
      ? Math.round(
          (gradedSubs.reduce((a, b) => a + (b.score as number), 0) / (gradedSubs.length * 10)) * 100
        )
      : 80;

  // Attendance stats
  let presentDays = 0;
  let totalMarkedDays = 0;
  attendanceRecords.forEach((r) => {
    if (r.records && r.records[student.id]) {
      totalMarkedDays++;
      if (r.records[student.id].status === 'present' || r.records[student.id].status === 'late') {
        presentDays++;
      }
    }
  });
  const attendancePercent = totalMarkedDays > 0 ? Math.round((presentDays / totalMarkedDays) * 100) : 95;

  // Behaviors
  const studentBehaviors = behaviors.filter((b) => b.studentId === student.id);
  const positiveBehaviors = studentBehaviors.filter((b) => b.type === 'positive').length;
  const improveBehaviors = studentBehaviors.filter((b) => b.type === 'needs_improvement').length;

  // AI Analysis state
  const [loadingAi, setLoadingAi] = useState(false);
  const [analysis, setAnalysis] = useState<{
    overview: string;
    skillsRadar: {
      knowledge: number;
      discipline: number;
      responsibility: number;
      participation: number;
      criticalThinking: number;
    };
    strengths: string[];
    growthAreas: string[];
    teacherAdvice: string;
  } | null>(null);

  useEffect(() => {
    fetchSkillAnalysis();
  }, [student.id]);

  const fetchSkillAnalysis = async () => {
    setLoadingAi(true);
    try {
      const data = await analyzeStudentSkillsWithAI({
        studentName: student.name,
        submissionsCount: studentSubs.length,
        averageScorePercent: avgScore,
        attendancePercent,
        positiveBehaviorCount: positiveBehaviors,
        improveBehaviorCount: improveBehaviors,
      });
      setAnalysis(data as any);
    } catch (err) {
      console.warn('Skill analysis notice:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const skills = [
    { label: 'ความรู้ความเข้าใจ (Knowledge)', value: analysis?.skillsRadar?.knowledge ?? avgScore, color: 'bg-blue-600' },
    { label: 'การคิดวิเคราะห์ (Critical Thinking)', value: analysis?.skillsRadar?.criticalThinking ?? Math.round(avgScore * 0.9), color: 'bg-indigo-600' },
    { label: 'ระเบียบวินัยและความสม่ำเสมอ (Discipline)', value: analysis?.skillsRadar?.discipline ?? attendancePercent, color: 'bg-teal-600' },
    { label: 'ความรับผิดชอบการส่งงาน (Responsibility)', value: analysis?.skillsRadar?.responsibility ?? 88, color: 'bg-amber-600' },
    { label: 'การมีส่วนร่วมในห้องเรียน (Participation)', value: analysis?.skillsRadar?.participation ?? 85, color: 'bg-purple-600' },
  ];

  return (
    <div id="skill-report-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:border-none print:shadow-none print:max-w-none">
        {/* Header */}
        <div className="bg-linear-to-r from-teal-700 via-indigo-700 to-blue-700 p-6 text-white flex items-center justify-between print:bg-none print:text-black">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/60 shadow-md flex items-center justify-center font-bold text-white shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{fullStudent.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-semibold">
                  รหัส {fullStudent.studentId}
                </span>
              </div>
              <p className="text-xs text-blue-100">
                รายงานผลสัมฤทธิ์และทักษะรายบุคคล (Personalized Learning Profile)
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                {classroom ? `${classroom.name} (${classroom.subject})` : 'ห้องเรียน'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="พิมพ์รายงาน"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500">งานที่ส่งแล้ว</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{studentSubs.length} งาน</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500">คะแนนเฉลี่ย</span>
              <div className="text-lg font-bold text-blue-600 mt-1">{avgScore}%</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500">การเข้าเรียน</span>
              <div className="text-lg font-bold text-emerald-600 mt-1">{attendancePercent}%</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500">แต้มสะสม</span>
              <div className="text-lg font-bold text-amber-600 mt-1">{fullStudent.totalPoints} pts</div>
            </div>
          </div>

          {/* 5 Core Skills Bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>ระดับทักษะ 5 ด้านตามเกณฑ์มาตรฐาน</span>
              </h3>
              <span className="text-[11px] text-slate-400">เต็ม 100 คะแนน</span>
            </div>

            <div className="space-y-2.5">
              {skills.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{s.label}</span>
                    <span className="font-bold text-slate-900">{s.value}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-500`}
                      style={{ width: `${s.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Comprehensive Analysis Box */}
          <div className="p-4 bg-linear-to-br from-teal-50 via-indigo-50 to-purple-50 border border-teal-200/80 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <BrainCircuit className="w-4 h-4 text-teal-600" />
                <span>ผลการวิเคราะห์เจาะลึกเฉพาะบุคคลโดย Gemini AI</span>
              </div>
              {loadingAi && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />}
            </div>

            {analysis ? (
              <div className="space-y-3">
                <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-teal-100 shadow-xs">
                  {analysis.overview}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                    <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>จุดแข็งสำคัญ (Strengths):</span>
                    </div>
                    <ul className="list-disc list-inside text-emerald-900 space-y-0.5 text-[11px]">
                      {analysis.strengths?.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                    <div className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>จุดที่ควรส่งเสริม (Growth Areas):</span>
                    </div>
                    <ul className="list-disc list-inside text-amber-900 space-y-0.5 text-[11px]">
                      {analysis.growthAreas?.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl">
                  <div className="font-bold text-purple-900 flex items-center gap-1 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-600" />
                    <span>คำแนะนำสำหรับครูผู้สอนในการจัดการเรียนรู้รายบุคคล:</span>
                  </div>
                  <p className="text-purple-950 text-[11px] leading-relaxed">
                    {analysis.teacherAdvice}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400">
                {loadingAi ? 'AI กำลังประมวลผลข้อมูลผู้เรียน...' : 'คลิกเพื่อโหลดข้อมูล'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={fetchSkillAnalysis}
            disabled={loadingAi}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>วิเคราะห์ใหม่ด้วย AI</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

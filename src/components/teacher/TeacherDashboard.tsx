import React, { useState } from 'react';
import type { Classroom, Assignment, Submission, AttendanceRecord, BehaviorRecord, UserProfile, Quiz } from '../../types';
import {
  FileCheck2,
  Users,
  CalendarCheck,
  TrendingUp,
  Sparkles,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  BrainCircuit,
  Database,
  User,
  UserPlus,
} from 'lucide-react';

interface TeacherDashboardProps {
  classroom: Classroom | null;
  assignments: Assignment[];
  submissions: Submission[];
  attendanceRecords: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  quizzes?: Quiz[];
  studentCount?: number;
  students?: UserProfile[];
  onNavigateTab: (tab: string) => void;
  onOpenGradingModal: (submission: Submission, assignment: Assignment) => void;
  onOpenSkillModal: (student: { id: string; name: string }) => void;
  onOpenClassroomSettings: () => void;
  onOpenCreateClassroom?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  classroom,
  assignments,
  submissions,
  attendanceRecords,
  behaviors,
  quizzes = [],
  studentCount,
  students = [],
  onNavigateTab,
  onOpenGradingModal,
  onOpenSkillModal,
  onOpenClassroomSettings,
  onOpenCreateClassroom,
}) => {
  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm border border-slate-200 mt-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">พร้อมสำหรับการเริ่มต้นใช้งานจริง</h2>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          ระบบได้เคลียร์ห้องเรียนและข้อมูลตัวอย่างทั้งหมดเรียบร้อยแล้ว คุณครูสามารถเริ่มต้นสร้างห้องเรียนวิชาจริงของคุณเพื่อเริ่มจัดการเรียนการสอนและเชิญนักเรียนเข้าร่วมได้ทันที
        </p>
        <button
          type="button"
          id="btn-create-first-class"
          onClick={onOpenCreateClassroom}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          สร้างห้องเรียนแรกของคุณ
        </button>
      </div>
    );
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted');
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');

  // Today's attendance calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find((r) => r.date === todayStr);
  let presentCount = 0;
  let totalMarked = 0;
  if (todayRecord && todayRecord.records) {
    const values = Object.values(todayRecord.records) as Array<{ status: string; note?: string }>;
    totalMarked = values.length;
    presentCount = values.filter((v) => v.status === 'present').length;
  }
  const effectiveStudentCount = typeof studentCount === 'number' ? studentCount : students.length;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;

  // Average score
  const scores = gradedSubmissions.map((s) => s.score).filter((s): s is number => typeof s === 'number');
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-teal-500 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ห้องเรียน: {classroom.subject}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="text-blue-100 text-sm max-w-xl">
              {classroom.description || 'ยินดีต้อนรับสู่ระบบจัดการเรียนรู้และติดตามผลการเรียนรู้แบบเรียลไทม์'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-blue-100">
              <span className="bg-white/15 px-2.5 py-1 rounded-md">รหัสห้องเรียน: <strong className="text-white font-mono text-sm tracking-wider">{classroom.code}</strong></span>
              {classroom.schedule && <span className="bg-white/15 px-2.5 py-1 rounded-md">{classroom.schedule}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {onOpenCreateClassroom && (
              <button
                type="button"
                id="btn-quick-create-class"
                onClick={onOpenCreateClassroom}
                className="px-4 py-2.5 bg-blue-700/80 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md border border-white/20 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>สร้างห้องเรียนใหม่</span>
              </button>
            )}
            <button
              type="button"
              id="btn-quick-manage-class"
              onClick={onOpenClassroomSettings}
              className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>เพิ่ม-ลดนักเรียน & สมาชิก</span>
            </button>
            <button
              type="button"
              id="btn-quick-assignments"
              onClick={() => onNavigateTab('assignments')}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>การบ้าน & ตรวจงาน</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending Evaluations */}
        <div
          id="card-metric-pending"
          onClick={() => onNavigateTab('assignments')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">งานรอตรวจ</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pendingSubmissions.length}</span>
            <span className="text-xs text-amber-600 font-medium">รายการ</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">มีการบ้านรอครูประเมินและให้คะแนน</p>
        </div>

        {/* Metric 2: Today Attendance */}
        <div
          id="card-metric-attendance"
          onClick={() => onNavigateTab('attendance')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">การเข้าเรียนวันนี้</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{attendanceRate}%</span>
            <span className="text-xs text-emerald-600 font-medium">มาเรียน {presentCount}/{totalMarked || effectiveStudentCount} คน</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">เช็คชื่อแบบเรียลไทม์</p>
        </div>

        {/* Metric 3: Classroom Students */}
        <div
          id="card-metric-students"
          onClick={onOpenClassroomSettings}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">นักเรียนในห้อง</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {effectiveStudentCount}
            </span>
            <span className="text-xs text-blue-600 font-medium">คน</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">คลิกเพื่อ เพิ่ม/ลด/จัดการ รายชื่อนักเรียน</p>
        </div>

        {/* Metric 4: Average Score */}
        <div
          id="card-metric-avg"
          onClick={() => onNavigateTab('assignments')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">คะแนนเฉลี่ยรวม</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{avgScore}</span>
            <span className="text-xs text-purple-600 font-medium">/ 10 คะแนน</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">ประเมินผลสัมฤทธิ์ทางการเรียน</p>
        </div>
      </div>

      {/* Main Grid: Pending Submissions with AI Grader & Student Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Submissions Needing Review */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">งานที่ค้างตรวจ & รอประเมินคะแนน</h2>
              {pendingSubmissions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                  {pendingSubmissions.length} รอตรวจ
                </span>
              )}
            </div>
            <button
              type="button"
              id="btn-view-all-assignments"
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              ดูการบ้านทั้งหมด &rarr;
            </button>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold text-slate-800">ไม่มีงานค้างตรวจในขณะนี้</h3>
              <p className="text-xs text-slate-500 mt-1">คุณครูตรวจการบ้านที่ส่งเข้ามาครบถ้วนแล้ว</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((sub) => {
                const asg = assignments.find((a) => a.id === sub.assignmentId) || {
                  id: sub.assignmentId,
                  title: 'การบ้าน',
                  description: '',
                  dueDate: '',
                  maxScore: 10,
                  pointsReward: 50,
                  createdAt: '',
                  classroomId: classroom.id,
                };

                return (
                  <div
                    key={sub.id}
                    id={`submission-item-${sub.id}`}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 grow">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{sub.studentName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                          ส่งแล้ว
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-indigo-900">{asg.title}</div>
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{sub.content}"
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </span>
                        <span>คะแนนเต็ม {asg.maxScore} คะแนน</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        id={`btn-grade-ai-${sub.id}`}
                        onClick={() => onOpenGradingModal(sub, asg)}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>ตรวจงาน & AI แนะนำ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recently Graded Section */}
          {gradedSubmissions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                ผลงานที่ตรวจเสร็จสิ้นแล้วล่าสุด ({gradedSubmissions.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gradedSubmissions.slice(0, 4).map((g) => (
                  <div key={g.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{g.studentName}</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        {g.score} คะแนน
                      </span>
                    </div>
                    {g.teacherFeedback && (
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-1">"{g.teacherFeedback}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Student Roster & AI Skill Quick Analysis */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">นักเรียนในชั้นเรียน</h2>
            </div>
            <button
              type="button"
              id="btn-view-all-students"
              onClick={() => onNavigateTab('students')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800"
            >
              จัดการ &rarr;
            </button>
          </div>

          {students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">ยังไม่มีนักเรียนในห้องเรียนนี้</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                แจกรหัสห้องเรียน <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{classroom.code}</span> ให้นักเรียนเพื่อเข้าร่วม หรือเพิ่มรายชื่อในเมนูจัดการห้องเรียน
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('students')}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                เพิ่ม/จัดการนักเรียน
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {students.map((std) => {
                const stdSubs = submissions.filter((s) => s.studentId === std.id);
                const stdScores = stdSubs.filter((s) => typeof s.score === 'number').map((s) => s.score as number);
                const stdAvg = stdScores.length > 0 ? (stdScores.reduce((a, b) => a + b, 0) / stdScores.length).toFixed(1) : '-';

                return (
                  <div key={std.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{std.name}</div>
                        <div className="text-[11px] text-slate-500">รหัส: {std.studentId || '-'} | ชั้น {std.grade || '-'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            {std.totalPoints || 0} แต้ม
                          </span>
                          <span className="text-[10px] text-slate-400">เฉลี่ย {stdAvg}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id={`btn-skill-report-${std.id}`}
                      onClick={() => onOpenSkillModal({ id: std.id, name: std.name })}
                      className="p-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors text-xs font-medium flex items-center gap-1 shrink-0"
                      title="ดูรายงานสรุปทักษะ AI รายบุคคล"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      <span className="hidden sm:inline">ทักษะ AI</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Tools Box */}
          <div className="p-4 bg-linear-to-br from-slate-900 to-indigo-950 rounded-2xl text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">เครื่องมือนวัตกรรมครู</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-slate-300">
              ลดภาระเตรียมสอนด้วยระบบช่วยตรวจงาน และวิเคราะห์ผลการเรียนรู้นักเรียนรายบุคคล
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="btn-quick-attendance"
                onClick={() => onNavigateTab('attendance')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-center font-medium transition-colors"
              >
                เช็คชื่อรายวัน
              </button>
              <button
                type="button"
                id="btn-quick-lessons"
                onClick={() => onNavigateTab('lessons')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-center font-medium transition-colors"
              >
                คลังสื่อการสอน
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

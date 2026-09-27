import React, { useState } from 'react';
import type { Classroom, Assignment, Submission, UserProfile } from '../../types';
import { joinClassroomByCode } from '../../services/firestoreService';
import {
  Sparkles,
  Flame,
  Award,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  ArrowRight,
  PlusCircle,
  Check,
  User,
  Edit,
} from 'lucide-react';

interface StudentDashboardProps {
  classroom: Classroom | null;
  classrooms?: Classroom[];
  assignments: Assignment[];
  submissions: Submission[];
  student: UserProfile;
  onNavigateTab: (tab: string) => void;
  onSelectAssignmentToSubmit: (asg: Assignment) => void;
  onClassroomJoined?: (classroom: Classroom) => void;
  onOpenEditProfile?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  classroom,
  classrooms = [],
  assignments,
  submissions,
  student,
  onNavigateTab,
  onSelectAssignmentToSubmit,
  onClassroomJoined,
  onOpenEditProfile,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const joined = await joinClassroomByCode(joinCode, student.id);
      if (joined) {
        setJoinSuccess(`เข้าร่วมห้องเรียน "${joined.name}" เรียบร้อยแล้ว!`);
        setJoinCode('');
        if (onClassroomJoined) {
          onClassroomJoined(joined);
        }
      } else {
        setJoinError('ไม่พบห้องเรียนด้วยรหัสนี้ กรุณาตรวจสอบรหัส 6 ตัวอักษร');
      }
    } catch {
      setJoinError('เกิดข้อผิดพลาดในการเข้าร่วมห้องเรียน');
    }
  };

  if (!classroom) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ยินดีต้อนรับ, {student.name}</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            คุณยังไม่ได้เข้าร่วมห้องเรียนวิชาใดๆ กรุณากรอกรหัสห้องเรียน 6 หลักที่คุณครูผู้สอนมอบให้เพื่อเข้าร่วมห้องเรียน
          </p>

          <form onSubmit={handleJoinClassroom} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="กรอกรหัส 6 หลัก เช่น SCI301"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-base font-mono uppercase tracking-widest font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
              >
                เข้าร่วม
              </button>
            </div>
            {joinSuccess && <p className="text-xs text-emerald-600 font-semibold">{joinSuccess}</p>}
            {joinError && <p className="text-xs text-rose-600 font-semibold">{joinError}</p>}
          </form>
        </div>
      </div>
    );
  }

  const studentSubmissionsMap = new Map<string, Submission>();
  submissions
    .filter((s) => s.studentId === student.id)
    .forEach((s) => {
      studentSubmissionsMap.set(s.assignmentId, s);
    });

  const pendingAssignments = assignments.filter((a) => !studentSubmissionsMap.has(a.id));
  const gradedSubmissions = submissions.filter((s) => s.studentId === student.id && s.status === 'graded');

  // Only registered classrooms where student actually belongs
  const registeredClassrooms = classrooms.filter(
    (c) => c && Array.isArray(c.studentIds) && c.studentIds.includes(student.id)
  );

  // If classrooms array was not passed or only activeClassroom is present and verified
  const coursesToDisplay = registeredClassrooms.length > 0
    ? registeredClassrooms
    : (classroom && classroom.studentIds?.includes(student.id) ? [classroom] : []);

  return (
    <div className="space-y-6">
      {/* Student Welcome & Gamification Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-teal-600 via-emerald-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl shadow-teal-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={onOpenEditProfile}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/60 shadow-lg flex items-center justify-center text-white group-hover:bg-white/30 transition-all">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div
                className="absolute -bottom-1 -right-1 p-1.5 bg-white text-teal-700 rounded-lg shadow-md hover:bg-teal-50 transition-colors"
                title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์"
              >
                <Edit className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ระดับ {student.level || 1} • {student.grade || 'ม.3/1'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">สวัสดี, {student.name}</h1>
              <p className="text-xs sm:text-sm text-teal-100">
                {classroom ? `ห้องเรียนปัจจุบัน: ${classroom.name} (ครู: ${classroom.teacherName})` : `ลงทะเบียนแล้ว ${coursesToDisplay.length} วิชา`}
              </p>
            </div>
          </div>

          {/* Points & Streak Badges */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-xl font-black text-white">{student.totalPoints || 0}</span>
              </div>
              <span className="text-[10px] text-teal-100 uppercase tracking-wider font-semibold">แต้มสะสม</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-orange-400">
                <Flame className="w-4 h-4 fill-orange-400" />
                <span className="text-xl font-black text-white">{student.streakDays || 7}</span>
              </div>
              <span className="text-[10px] text-teal-100 uppercase tracking-wider font-semibold">วันต่อเนื่อง</span>
            </div>

            <button
              type="button"
              id="btn-nav-to-points"
              onClick={() => onNavigateTab('points')}
              className="p-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-md transition-all flex flex-col items-center justify-center min-w-[90px]"
            >
              <Sparkles className="w-5 h-5 mb-0.5 text-slate-900" />
              <span>ระบบสะสมแต้ม</span>
            </button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
      </div>

      {/* Urgent Homework Alert & Quick Submit */}
      {pendingAssignments.length > 0 && (
        <div className="p-5 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  แจ้งเตือนงานที่ต้องส่งเร็วๆ นี้
                </span>
                <span className="px-2 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {pendingAssignments.length} งานค้างส่ง
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {pendingAssignments[0].title}
              </h3>
              <p className="text-xs text-amber-800">
                กำหนดส่ง: {pendingAssignments[0].dueDate} (+{pendingAssignments[0].pointsReward} แต้ม)
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-quick-submit-pending"
            onClick={() => {
              onNavigateTab('assignments');
              onSelectAssignmentToSubmit(pendingAssignments[0]);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>ส่งการบ้านนี้ทันที</span>
          </button>
        </div>
      )}

      {/* Main Grid: Schedule & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timetable strictly based on registered courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">ตารางเรียนรายวิชาที่ลงทะเบียน</h2>
                <p className="text-[11px] text-slate-500">แสดงเฉพาะรายวิชาที่นักเรียนลงทะเบียนจริงในระบบเท่านั้น</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {coursesToDisplay.length} วิชาที่ลงทะเบียน
            </span>
          </div>

          {coursesToDisplay.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ตารางเรียนจะแสดงตามรายวิชาที่นักเรียนลงทะเบียนจริงเท่านั้น กรุณาใช้รหัสห้อง 6 หลักเพื่อเข้าร่วมวิชาเรียน
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
              {coursesToDisplay.map((course) => (
                <div key={course.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-800 font-mono font-bold text-xs text-center min-w-[120px] border border-teal-100">
                      {course.schedule || 'ตามตารางสอน'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{course.name}</span>
                        {course.subject && <span className="text-slate-400 font-normal">({course.subject})</span>}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ครูผู้สอน: {course.teacherName} • รหัสวิชา: {course.code}
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                    ลงทะเบียนแล้ว
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Graded Work Section */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                ผลคะแนนและข้อคิดเห็นล่าสุด
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('assignments')}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
              >
                ดูทั้งหมด &rarr;
              </button>
            </div>

            {gradedSubmissions.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                ยังไม่มีคะแนนที่ตรวจเสร็จสิ้น
              </div>
            ) : (
              <div className="space-y-2.5">
                {gradedSubmissions.slice(0, 3).map((sub) => {
                  const asg = assignments.find((a) => a.id === sub.assignmentId);
                  return (
                    <div key={sub.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{asg?.title || 'การบ้าน'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {sub.score} / {asg?.maxScore || 10} คะแนน
                          </span>
                          {sub.pointsAwarded ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              +{sub.pointsAwarded} แต้ม
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {sub.teacherFeedback && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-slate-800">คุณครูแนะนำ:</strong> "{sub.teacherFeedback}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Join Classroom Code & Quick Actions */}
        <div className="space-y-4">
          {/* Join Classroom Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-teal-600" />
              <span>เข้าร่วมห้องเรียนเพิ่มเติม</span>
            </h3>
            <p className="text-xs text-slate-500">
              กรอกรหัส 6 หลักที่คุณครูมอบให้เพื่อเข้าเรียนในวิชาอื่น
            </p>

            <form onSubmit={handleJoinClassroom} className="space-y-2.5">
              <input
                type="text"
                placeholder="เช่น SCI301"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 uppercase font-mono tracking-widest text-center bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
              />

              {joinSuccess && (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{joinSuccess}</span>
                </div>
              )}

              {joinError && (
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{joinError}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-submit-join-class"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                เข้าร่วมห้องเรียน
              </button>
            </form>
          </div>

          {/* Quick Learning Portals */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              เมนูลัดการเรียนรู้
            </h3>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                id="btn-student-quick-lessons"
                onClick={() => onNavigateTab('lessons')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-slate-800">คลังบทเรียนและวิดีโอ</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                id="btn-student-quick-certs"
                onClick={() => onNavigateTab('certificates')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">เกียรติบัตรและของรางวัล</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/auth/LoginModal';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AttendanceManager } from './components/teacher/AttendanceManager';
import { AssignmentManager } from './components/teacher/AssignmentManager';
import { AIQuizGenerator } from './components/teacher/AIQuizGenerator';
import { LessonRepository } from './components/teacher/LessonRepository';
import { BehaviorManager } from './components/teacher/BehaviorManager';
import { SkillReportModal } from './components/teacher/SkillReportModal';
import { ClassroomManager } from './components/teacher/ClassroomManager';
import { CreateClassroomModal } from './components/teacher/CreateClassroomModal';
import { JoinClassroomModal } from './components/student/JoinClassroomModal';
import { LoginPage } from './components/auth/LoginPage';
import { AIGradingModal } from './components/teacher/AIGradingModal';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentAssignments } from './components/student/StudentAssignments';
import { StudentQuizPlayer } from './components/student/StudentQuizPlayer';
import { StudentPoints } from './components/student/StudentPoints';
import { ClassroomChat } from './components/chat/ClassroomChat';
import { EditProfileModal } from './components/profile/EditProfileModal';
import {
  subscribeToClassrooms,
  subscribeToAssignments,
  subscribeToSubmissions,
  subscribeToAttendance,
  subscribeToBehaviors,
  subscribeToQuizzes,
  subscribeToLessons,
  getClassroomStudents,
  clearAllSystemData,
} from './services/firestoreService';
import type {
  Classroom,
  Assignment,
  Submission,
  AttendanceRecord,
  BehaviorRecord,
  Quiz,
  Lesson,
  UserProfile,
} from './types';
import {
  LayoutDashboard,
  CalendarCheck,
  FileCheck2,
  BrainCircuit,
  FolderOpen,
  HeartHandshake,
  MessageSquare,
  Award,
  BookOpen,
  Sparkles,
  Layers,
  Settings,
  Plus,
  GraduationCap,
  Users,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, loading, updateProfile } = useAuth();

  // Classroom state - Start empty for real production use
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorRecord[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    if (activeTab === 'quizzes') {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Enrolled students in active classroom
  const [classroomStudents, setClassroomStudents] = useState<UserProfile[]>([]);

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isJoinClassModalOpen, setIsJoinClassModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillStudent, setSkillStudent] = useState<{ id: string; name: string } | null>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);

  // Classroom lifecycle handlers
  const handleClassroomCreated = (newClassroom: Classroom) => {
    setClassrooms((prev) => [newClassroom, ...prev.filter((c) => c.id !== newClassroom.id)]);
    setActiveClassroom(newClassroom);
    setIsCreateClassModalOpen(false);
  };

  const handleClassroomUpdated = (updated: Classroom) => {
    setClassrooms((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (activeClassroom?.id === updated.id) {
      setActiveClassroom(updated);
      const studentIds = (updated.studentIds || []).filter((id) => id !== updated.teacherId);
      getClassroomStudents(studentIds).then(setClassroomStudents).catch(console.warn);
    }
  };

  // Sync enrolled students whenever active classroom changes
  useEffect(() => {
    if (!activeClassroom) {
      setClassroomStudents([]);
      return;
    }
    let isMounted = true;
    const loadStudents = async () => {
      const studentIds = (activeClassroom.studentIds || []).filter((id) => id !== activeClassroom.teacherId);
      const list = await getClassroomStudents(studentIds);
      if (isMounted) {
        setClassroomStudents(list);
      }
    };
    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [activeClassroom?.id, activeClassroom?.studentIds?.join(',')]);

  const handleClassroomDeleted = (deletedId: string) => {
    setClassrooms((prev) => {
      const filtered = prev.filter((c) => c.id !== deletedId);
      if (activeClassroom?.id === deletedId) {
        setActiveClassroom(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
    setIsClassManagerOpen(false);
  };

  const handleClassroomJoined = (joined: Classroom) => {
    setClassrooms((prev) => {
      const exists = prev.some((c) => c.id === joined.id);
      return exists ? prev : [joined, ...prev];
    });
    setActiveClassroom(joined);
    setIsJoinClassModalOpen(false);
  };

  // Assignment selected by student from Dashboard to jump straight to submit
  const [studentPendingAsg, setStudentPendingAsg] = useState<Assignment | null>(null);

  // Subscribe to classrooms for the current user only
  useEffect(() => {
    if (!currentUser) {
      setClassrooms([]);
      setActiveClassroom(null);
      return;
    }

    const unsub = subscribeToClassrooms((cls) => {
      // Filter classrooms relevant to this user:
      // If teacher: classrooms created by teacher
      // If student: classrooms where studentIds includes student
      const userClassrooms = cls.filter((c) => {
        if (currentUser.role === 'teacher') {
          return c.teacherId === currentUser.id;
        } else {
          return Array.isArray(c.studentIds) && c.studentIds.includes(currentUser.id);
        }
      });

      setClassrooms(userClassrooms);
      if (userClassrooms.length > 0) {
        setActiveClassroom((prev) => (prev ? userClassrooms.find((c) => c.id === prev.id) || userClassrooms[0] : userClassrooms[0]));
      } else {
        setActiveClassroom(null);
      }
    });
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // Subscribe to classroom entities whenever activeClassroom changes
  useEffect(() => {
    if (!activeClassroom) return;

    const unsubAssignments = subscribeToAssignments(activeClassroom.id, setAssignments);
    const unsubSubmissions = subscribeToSubmissions(activeClassroom.id, setSubmissions);
    const unsubAttendance = subscribeToAttendance(activeClassroom.id, setAttendanceRecords);
    const unsubBehaviors = subscribeToBehaviors(activeClassroom.id, setBehaviors);
    const unsubQuizzes = subscribeToQuizzes(activeClassroom.id, setQuizzes);
    const unsubLessons = subscribeToLessons(activeClassroom.id, setLessons);

    return () => {
      unsubAssignments();
      unsubSubmissions();
      unsubAttendance();
      unsubBehaviors();
      unsubQuizzes();
      unsubLessons();
    };
  }, [activeClassroom?.id]);

  const handleOpenGradingModal = (submission: Submission, assignment: Assignment) => {
    setGradingSubmission(submission);
    setGradingAssignment(assignment);
    setIsGradingModalOpen(true);
  };

  const handleOpenSkillModal = (student: { id: string; name: string }) => {
    setSkillStudent(student);
    setIsSkillModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl animate-pulse mb-4">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold">โรงเรียนไทยนิยมสงเคราะห์</h3>
        <p className="text-xs text-slate-400 mt-1">กำลังเชื่อมต่อฐานข้อมูลระบบห้องเรียนดิจิทัล Cloud Firestore...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const isTeacher = currentUser?.role === 'teacher';

  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'submitted').length;

  interface TabItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }

  // Navigation Items per Role
  const teacherTabs: TabItem[] = [
    { id: 'dashboard', label: 'ภาพรวมห้องเรียน', icon: LayoutDashboard },
    { id: 'students', label: `นักเรียนในห้อง (${classroomStudents.length})`, icon: Users },
    { id: 'attendance', label: 'เช็คชื่อเข้าเรียน', icon: CalendarCheck },
    {
      id: 'assignments',
      label: 'การบ้าน & ตรวจงาน',
      icon: FileCheck2,
      badge: pendingSubmissionsCount > 0 ? pendingSubmissionsCount : undefined,
    },
    { id: 'lessons', label: 'คลังบทเรียน & สื่อ', icon: FolderOpen },
    { id: 'behaviors', label: 'บันทึกพฤติกรรม', icon: HeartHandshake },
    { id: 'chat', label: 'แชทห้องเรียน & ถามตอบ', icon: MessageSquare },
  ];

  const studentTabs: TabItem[] = [
    { id: 'dashboard', label: 'หน้าหลัก & ตารางเรียน', icon: LayoutDashboard },
    { id: 'assignments', label: 'การบ้านของฉัน', icon: FileCheck2 },
    { id: 'lessons', label: 'คลังบทเรียน & สื่อ', icon: BookOpen },
    { id: 'points', label: 'สะสมแต้ม & เลเวล', icon: Sparkles, highlight: true },
    { id: 'chat', label: 'ถามครู & แชทห้องเรียน', icon: MessageSquare },
  ];

  const tabs = isTeacher ? teacherTabs : studentTabs;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <Navbar
        classrooms={classrooms}
        activeClassroom={activeClassroom}
        onSelectClassroom={(c) => setActiveClassroom(c)}
        onOpenChat={() => setActiveTab('chat')}
        pendingSubmissionsCount={pendingSubmissionsCount}
        onOpenCreateClassroom={() => setIsCreateClassModalOpen(true)}
        onOpenJoinClassroom={() => setIsJoinClassModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Sub-Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-1.5 shrink-0">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;

                return (
                  <button
                    key={t.id}
                    id={`nav-tab-${t.id}`}
                    type="button"
                    onClick={() => {
                      if (t.id === 'students') {
                        setIsClassManagerOpen(true);
                      } else {
                        setActiveTab(t.id);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      isActive
                        ? isTeacher
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    {t.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {t.badge}
                      </span>
                    )}
                    {t.highlight && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick classroom triggers for teacher */}
            {isTeacher && (
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  type="button"
                  id="btn-create-classroom-subnav"
                  onClick={() => setIsCreateClassModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ สร้างห้องเรียนใหม่</span>
                </button>
                <button
                  type="button"
                  id="btn-open-classroom-settings-subnav"
                  onClick={() => setIsClassManagerOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>เพิ่ม-ลดนักเรียน & รหัสห้อง</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Teacher Views */}
        {isTeacher && (
          <>
            {activeTab === 'dashboard' && (
              <TeacherDashboard
                classroom={activeClassroom}
                assignments={assignments}
                submissions={submissions}
                attendanceRecords={attendanceRecords}
                behaviors={behaviors}
                quizzes={quizzes}
                studentCount={classroomStudents.length}
                onNavigateTab={(tab) => {
                  if (tab === 'students') {
                    setIsClassManagerOpen(true);
                  } else {
                    setActiveTab(tab);
                  }
                }}
                onOpenGradingModal={handleOpenGradingModal}
                onOpenSkillModal={handleOpenSkillModal}
                onOpenClassroomSettings={() => setIsClassManagerOpen(true)}
                onOpenCreateClassroom={() => setIsCreateClassModalOpen(true)}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceManager
                classroom={activeClassroom}
                attendanceRecords={attendanceRecords}
                students={classroomStudents}
              />
            )}

            {activeTab === 'assignments' && (
              <AssignmentManager
                classroom={activeClassroom}
                assignments={assignments}
                submissions={submissions}
                students={classroomStudents}
                onOpenGradingModal={handleOpenGradingModal}
              />
            )}

            {activeTab === 'lessons' && (
              <LessonRepository
                classroom={activeClassroom}
                lessons={lessons}
                isTeacher={true}
              />
            )}

            {activeTab === 'behaviors' && (
              <BehaviorManager
                classroom={activeClassroom}
                behaviors={behaviors}
                students={classroomStudents}
              />
            )}

            {activeTab === 'chat' && (
              <ClassroomChat
                classroom={activeClassroom}
                currentUser={currentUser}
              />
            )}
          </>
        )}

        {/* Student Views */}
        {!isTeacher && currentUser && (
          <>
            {activeTab === 'dashboard' && (
              <StudentDashboard
                classroom={activeClassroom}
                classrooms={classrooms}
                assignments={assignments}
                submissions={submissions}
                student={currentUser}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectAssignmentToSubmit={(asg) => {
                  setStudentPendingAsg(asg);
                  setActiveTab('assignments');
                }}
                onClassroomJoined={handleClassroomJoined}
                onOpenEditProfile={() => setIsEditProfileOpen(true)}
              />
            )}

            {activeTab === 'assignments' && (
              <StudentAssignments
                classroom={activeClassroom}
                assignments={assignments}
                submissions={submissions}
                student={currentUser}
              />
            )}

            {activeTab === 'lessons' && (
              <LessonRepository
                classroom={activeClassroom}
                lessons={lessons}
                isTeacher={false}
              />
            )}

            {activeTab === 'points' && (
              <StudentPoints
                student={currentUser}
                submissions={submissions}
                behaviors={behaviors}
              />
            )}

            {activeTab === 'chat' && (
              <ClassroomChat
                classroom={activeClassroom}
                currentUser={currentUser}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {isGradingModalOpen && gradingSubmission && gradingAssignment && (
        <AIGradingModal
          submission={gradingSubmission}
          assignment={gradingAssignment}
          isOpen={isGradingModalOpen}
          onClose={() => {
            setIsGradingModalOpen(false);
            setGradingSubmission(null);
            setGradingAssignment(null);
          }}
        />
      )}

      {isSkillModalOpen && skillStudent && (
        <SkillReportModal
          student={skillStudent}
          classroom={activeClassroom}
          submissions={submissions}
          attendanceRecords={attendanceRecords}
          behaviors={behaviors}
          isOpen={isSkillModalOpen}
          onClose={() => {
            setIsSkillModalOpen(false);
            setSkillStudent(null);
          }}
        />
      )}

      {isClassManagerOpen && (
        <ClassroomManager
          classroom={activeClassroom}
          submissions={submissions}
          attendanceRecords={attendanceRecords}
          behaviors={behaviors}
          isOpen={isClassManagerOpen}
          onClose={() => setIsClassManagerOpen(false)}
          onClassroomUpdated={handleClassroomUpdated}
          onClassroomDeleted={handleClassroomDeleted}
          onOpenCreateClassroom={() => {
            setIsClassManagerOpen(false);
            setIsCreateClassModalOpen(true);
          }}
        />
      )}

      {/* Classroom Creation Modal for Teachers */}
      <CreateClassroomModal
        isOpen={isCreateClassModalOpen}
        onClose={() => setIsCreateClassModalOpen(false)}
        currentUser={currentUser}
        onClassroomCreated={handleClassroomCreated}
      />

      {/* Join Classroom Modal for Students */}
      <JoinClassroomModal
        isOpen={isJoinClassModalOpen}
        onClose={() => setIsJoinClassModalOpen(false)}
        currentUser={currentUser}
        onClassroomJoined={handleClassroomJoined}
      />

      {/* Edit Profile Modal for Teachers and Students */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onSaveProfile={async (updates) => {
          await updateProfile(updates);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

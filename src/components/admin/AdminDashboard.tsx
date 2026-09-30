import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  GraduationCap,
  BookOpen,
  FileCheck2,
  Settings,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  Megaphone,
  UserCheck,
  UserX,
  ExternalLink,
  Layers,
  Sparkles,
  School,
  Lock,
  ChevronRight,
  Filter,
  Eye,
  RefreshCw,
  Award,
  Copy,
  FileSpreadsheet,
  Check,
  Table,
  Calendar,
  X,
  KeyRound,
  IdCard,
} from 'lucide-react';
import type { UserProfile, Classroom, UserRole, Assignment, Submission } from '../../types';
import {
  subscribeToUsers,
  saveUserProfile,
  deleteUserProfile,
  deleteClassroom,
  createClassroom,
} from '../../services/firestoreService';

interface AdminDashboardProps {
  currentUser: UserProfile;
  classrooms: Classroom[];
  assignments: Assignment[];
  submissions: Submission[];
  onSelectClassroom: (classroom: Classroom) => void;
  onOpenCreateClassroom?: () => void;
}

export type SheetReportType = 'overview' | 'students' | 'teachers' | 'assignments';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  classrooms,
  assignments,
  submissions,
  onSelectClassroom,
  onOpenCreateClassroom,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'classrooms' | 'reports' | 'settings'>('users');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'student' | 'admin'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Drawers
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isExportSheetsModalOpen, setIsExportSheetsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // In-app confirmation dialog (replaces window.confirm/alert)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // In-app Toast message
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('teacher');
  const [newUserGrade, setNewUserGrade] = useState('ม.3/1');
  const [newUserSubject, setNewUserSubject] = useState('วิทยาศาสตร์และเทคโนโลยี');
  const [newUserStudentId, setNewUserStudentId] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์');
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSuccess, setUserFormSuccess] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Edit user form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editGrade, setEditGrade] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editLevel, setEditLevel] = useState<number>(1);

  // Internal Create Classroom state
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('วิทยาศาสตร์และเทคโนโลยี');
  const [newClassTeacherName, setNewClassTeacherName] = useState(currentUser.name);
  const [newClassCode, setNewClassCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [newClassColor, setNewClassColor] = useState('from-blue-600 to-indigo-700');
  const [newClassSchedule, setNewClassSchedule] = useState('วันจันทร์ - ศุกร์ คาบที่ 3');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Broadcast announcement
  const [announcementText, setAnnouncementText] = useState(() => {
    return (
      localStorage.getItem('thainiyom_school_announcement') ||
      'ยินดีต้อนรับสู่ระบบห้องเรียนดิจิทัล โรงเรียนไทยนิยมสงเคราะห์ สำนักงานเขตบางเขน กทม.'
    );
  });
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  // Google Sheets Export States
  const [reportType, setReportType] = useState<SheetReportType>('overview');
  const [isCopied, setIsCopied] = useState(false);

  // Subscribe to all users in realtime
  useEffect(() => {
    const unsub = subscribeToUsers((users) => {
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    const unsub = subscribeToUsers((users) => {
      setAllUsers(users);
      setIsRefreshing(false);
      showToast('อัปเดตข้อมูลผู้ใช้งานและห้องเรียนเรียบร้อยแล้ว', 'success');
      unsub();
    });
  };

  // Stats
  const teacherCount = allUsers.filter((u) => u.role === 'teacher').length;
  const studentCount = allUsers.filter((u) => u.role === 'student').length;
  const adminCount = allUsers.filter((u) => u.role === 'admin').length;

  // Filtered users
  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesRole;
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.studentId && u.studentId.includes(q)) ||
      (u.grade && u.grade.toLowerCase().includes(q)) ||
      (u.subject && u.subject.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setUserFormError('กรุณากรอกชื่อและอีเมลให้ครบถ้วน');
      return;
    }

    setIsSavingUser(true);
    setUserFormError(null);
    try {
      const generatedId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let cleanInput = newUserEmail.trim();
      let cleanEmail = cleanInput.toLowerCase();
      if (!cleanEmail.includes('@')) {
        cleanEmail = `${cleanEmail}@thainiyom.ac.th`;
      }

      const userObj: UserProfile = {
        id: generatedId,
        name: newUserName.trim(),
        email: cleanEmail,
        role: newUserRole,
        grade: newUserRole === 'student' ? newUserGrade : undefined,
        studentId:
          newUserRole === 'student'
            ? newUserStudentId || (/^\d+$/.test(cleanInput) ? cleanInput : `STD${Math.floor(10000 + Math.random() * 90000)}`)
            : undefined,
        subject: newUserRole === 'teacher' ? newUserSubject : undefined,
        department: newUserRole === 'admin' ? newUserDepartment : undefined,
        password: newUserPassword || '123456',
        totalPoints: newUserRole === 'admin' ? 9999 : newUserRole === 'student' ? 100 : 500,
        level: newUserRole === 'admin' ? 99 : 1,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(userObj);
      setUserFormSuccess(`เพิ่มผู้ใช้งาน ${userObj.name} เรียบร้อยแล้ว`);
      showToast(`เพิ่มผู้ใช้งาน ${userObj.name} เรียบร้อยแล้ว`, 'success');
      setTimeout(() => {
        setIsAddUserOpen(false);
        setUserFormSuccess(null);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
      }, 800);
    } catch (err: any) {
      setUserFormError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกผู้ใช้');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditGrade(user.grade || 'ม.3/1');
    setEditStudentId(user.studentId || '');
    setEditSubject(user.subject || 'วิทยาศาสตร์และเทคโนโลยี');
    setEditDepartment(user.department || 'ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์');
    setEditPassword(user.password || '');
    setEditPoints(user.totalPoints || 0);
    setEditLevel(user.level || 1);
    setIsEditUserOpen(true);
  };

  // Submit Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast('กรุณากรอกชื่อและอีเมล', 'error');
      return;
    }

    try {
      const updated: UserProfile = {
        ...selectedUser,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        grade: editRole === 'student' ? editGrade.trim() : undefined,
        studentId: editRole === 'student' ? editStudentId.trim() : undefined,
        subject: editRole === 'teacher' ? editSubject.trim() : undefined,
        department: editRole === 'admin' ? editDepartment.trim() : undefined,
        password: editPassword.trim() || selectedUser.password || '123456',
        totalPoints: Number(editPoints) || 0,
        level: Number(editLevel) || 1,
      };

      await saveUserProfile(updated);
      setIsEditUserOpen(false);
      showToast(`บันทึกข้อมูลของ ${updated.name} เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + (err?.message || ''), 'error');
    }
  };

  // Open View User Profile
  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsViewUserOpen(true);
  };

  // Handle Role Change with In-App Confirmation
  const handleChangeRolePrompt = (user: UserProfile, newRole: UserRole) => {
    if (user.id === currentUser.id && newRole !== 'admin') {
      showToast('ไม่สามารถลดระดับสิทธิ์ของบัญชีแอดมินปัจจุบันที่คุณกำลังใช้งานอยู่ได้', 'error');
      return;
    }

    const roleName = newRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : newRole === 'teacher' ? 'คุณครู' : 'นักเรียน';

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการเปลี่ยนบทบาทผู้ใช้งาน',
      message: `คุณต้องการเปลี่ยนบทบาทของ "${user.name}" เป็น "${roleName}" ใช่หรือไม่?`,
      confirmText: 'ยืนยันเปลี่ยนบทบาท',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
      onConfirm: async () => {
        try {
          await saveUserProfile({
            ...user,
            role: newRole,
          });
          showToast(`เปลี่ยนบทบาทของ "${user.name}" เป็น ${roleName} สำเร็จ`, 'success');
        } catch (err: any) {
          showToast('เกิดข้อผิดพลาด: ' + (err?.message || ''), 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle Delete User with In-App Confirmation
  const handleDeleteUserPrompt = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      showToast('ไม่สามารถลบบัญชีแอดมินที่คุณกำลังใช้งานอยู่ได้', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบบัญชีผู้ใช้งาน',
      message: `คุณต้องการลบบัญชี "${user.name}" (${user.email}) ออกจากฐานข้อมูลของโรงเรียนหรือไม่? ข้อมูลการเรียนและชิ้นงานจะไม่สามารถกู้คืนได้`,
      confirmText: 'ลบบัญชีถาวร',
      confirmColor: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: async () => {
        try {
          await deleteUserProfile(user.id);
          showToast(`ลบบัญชี "${user.name}" เรียบร้อยแล้ว`, 'success');
        } catch (err: any) {
          showToast('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + (err?.message || ''), 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle Delete Classroom with In-App Confirmation
  const handleDeleteClassroomPrompt = (cls: Classroom) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบห้องเรียน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบห้องเรียน "${cls.name}" (รหัส: ${cls.code})? ข้อมูลการบ้านและการเช็คชื่อทั้งหมดในห้องจะถูกลบ`,
      confirmText: 'ลบห้องเรียน',
      confirmColor: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: async () => {
        try {
          await deleteClassroom(cls.id);
          showToast(`ลบห้องเรียน "${cls.name}" สำเร็จ`, 'success');
        } catch (err: any) {
          showToast('เกิดข้อผิดพลาดในการลบห้องเรียน: ' + (err?.message || ''), 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Internal Create Classroom Submit
  const handleInternalCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showToast('กรุณากรอกชื่อห้องเรียน', 'error');
      return;
    }

    setIsCreatingClass(true);
    try {
      const clsId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newCls: Classroom = {
        id: clsId,
        name: newClassName.trim(),
        subject: newClassSubject.trim() || 'วิชาทั่วไป',
        code: newClassCode.trim().toUpperCase() || Math.random().toString(36).substring(2, 8).toUpperCase(),
        teacherId: currentUser.id,
        teacherName: newClassTeacherName.trim() || currentUser.name,
        description: newClassDesc.trim() || `ห้องเรียนออนไลน์ โรงเรียนไทยนิยมสงเคราะห์`,
        color: newClassColor,
        studentIds: [],
        schedule: newClassSchedule.trim() || 'ตามตารางสอน',
        createdAt: new Date().toISOString(),
      };

      await createClassroom(newCls);
      showToast(`สร้างห้องเรียน "${newCls.name}" สำเร็จ (รหัสห้อง: ${newCls.code})`, 'success');
      setIsCreateClassModalOpen(false);
      setNewClassName('');
      setNewClassCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการสร้างห้องเรียน: ' + (err?.message || ''), 'error');
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = () => {
    localStorage.setItem('thainiyom_school_announcement', announcementText);
    setAnnouncementSaved(true);
    showToast('บันทึกและเผยแพร่ประกาศข่าวสารโรงเรียนเรียบร้อยแล้ว', 'success');
    setTimeout(() => setAnnouncementSaved(false), 2000);
  };

  // ==========================================
  // GOOGLE SHEETS REPORT GENERATORS
  // ==========================================

  // 1. School Executive Summary Data
  const generateOverviewSheetData = () => {
    const totalPointsSum = allUsers.reduce((sum, u) => sum + (u.totalPoints || 0), 0);
    const avgScore =
      submissions.length > 0
        ? Math.round((submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length) * 10) / 10
        : 0;

    return [
      { metric: 'ชื่อสถานศึกษา', value: 'โรงเรียนไทยนิยมสงเคราะห์', details: 'สำนักงานเขตบางเขน กรุงเทพมหานคร' },
      { metric: 'วันที่ออกรายงาน', value: new Date().toLocaleDateString('th-TH'), details: new Date().toLocaleTimeString('th-TH') },
      { metric: 'ผู้ใช้งานทั้งหมดในระบบ', value: `${allUsers.length} บัญชี`, details: 'บันทึกใน Google Cloud Firestore' },
      { metric: 'คุณครูผู้สอน', value: `${teacherCount} คน`, details: 'ผู้ดูแลการจัดการเรียนการสอนและตรวจการบ้าน' },
      { metric: 'นักเรียนทั้งหมด', value: `${studentCount} คน`, details: 'ผู้เรียนระดับประถมศึกษาและมัธยมศึกษา' },
      { metric: 'ผู้ดูแลระบบ (Admin)', value: `${adminCount} คน`, details: 'ฝ่ายบริหารและศูนย์เทคโนโลยีสารสนเทศ' },
      { metric: 'ห้องเรียนดิจิทัลทั้งหมด', value: `${classrooms.length} ห้อง`, details: 'ครอบคลุมทุกกลุ่มสาระการเรียนรู้' },
      { metric: 'ภาระงาน / การบ้านที่มอบหมาย', value: `${assignments.length} ชิ้นงาน`, details: 'พร้อมระบบตรวจประเมินด้วย AI' },
      { metric: 'ชิ้นงานที่นักเรียนส่งแล้ว', value: `${submissions.length} รายการ`, details: 'ส่งในรูปแบบไฟล์และข้อความ' },
      { metric: 'คะแนนเฉลี่ยการส่งงาน', value: `${avgScore} คะแนน`, details: 'คำนวณจากทุกชิ้นงานที่ตรวจแล้ว' },
      { metric: 'แต้มความดีสะสมรวม', value: `${totalPointsSum} แต้ม`, details: 'ระบบสะสมแต้มและเหรียญรางวัล ท.น.' },
    ];
  };

  // 2. Student Roster & Points Data
  const generateStudentSheetData = () => {
    const students = allUsers.filter((u) => u.role === 'student');
    return students.map((s, idx) => {
      const studentSubs = submissions.filter((sub) => sub.studentId === s.id);
      return {
        index: idx + 1,
        studentId: s.studentId || '-',
        name: s.name,
        grade: s.grade || 'ม.3/1',
        email: s.email,
        totalPoints: s.totalPoints || 0,
        level: s.level || 1,
        streakDays: s.streakDays || 0,
        submittedCount: studentSubs.length,
        registeredAt: new Date(s.createdAt).toLocaleDateString('th-TH'),
      };
    });
  };

  // 3. Teachers & Classrooms Data
  const generateTeacherSheetData = () => {
    return classrooms.map((c, idx) => {
      const classAssignments = assignments.filter((a) => a.classroomId === c.id);
      const classSubs = submissions.filter((s) => s.classroomId === c.id);
      return {
        index: idx + 1,
        classroomName: c.name,
        subject: c.subject,
        teacherName: c.teacherName,
        code: c.code,
        studentCount: c.studentIds?.length || 0,
        assignmentCount: classAssignments.length,
        submissionCount: classSubs.length,
        createdAt: new Date(c.createdAt).toLocaleDateString('th-TH'),
      };
    });
  };

  // 4. Assignments & Submissions Data
  const generateAssignmentSheetData = () => {
    return assignments.map((a, idx) => {
      const cls = classrooms.find((c) => c.id === a.classroomId);
      const asgSubs = submissions.filter((s) => s.assignmentId === a.id);
      const gradedCount = asgSubs.filter((s) => s.status === 'graded').length;
      return {
        index: idx + 1,
        classroom: cls?.name || 'ห้องเรียนทั่วไป',
        subject: cls?.subject || '-',
        title: a.title,
        maxScore: a.maxScore || 10,
        submittedCount: asgSubs.length,
        gradedCount: gradedCount,
        dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('th-TH') : 'ไม่มีกำหนด',
        createdAt: new Date(a.createdAt).toLocaleDateString('th-TH'),
      };
    });
  };

  // Export to CSV with UTF-8 BOM for Thai support in Google Sheets / Excel
  const handleDownloadCSV = (type: SheetReportType) => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let fileName = '';

    if (type === 'overview') {
      const data = generateOverviewSheetData();
      csvContent += '"หัวข้อสถิติ","จำนวน / ผลลัพธ์","รายละเอียดเพิ่มเติม"\n';
      data.forEach((r) => {
        csvContent += `"${r.metric}","${r.value}","${r.details}"\n`;
      });
      fileName = `สรุปภาพรวมโรงเรียนไทยนิยมสงเคราะห์_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'students') {
      const data = generateStudentSheetData();
      csvContent += '"ลำดับ","รหัสนักเรียน","ชื่อ-นามสกุล","ระดับชั้น","อีเมล","แต้มสะสม","เลเวล","วันต่อเนื่อง","ส่งงานแล้ว (ชิ้น)","วันที่ลงทะเบียน"\n';
      data.forEach((r) => {
        csvContent += `"${r.index}","${r.studentId}","${r.name}","${r.grade}","${r.email}","${r.totalPoints}","${r.level}","${r.streakDays}","${r.submittedCount}","${r.registeredAt}"\n`;
      });
      fileName = `รายชื่อนักเรียนและคะแนนสะสม_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'teachers') {
      const data = generateTeacherSheetData();
      csvContent += '"ลำดับ","ชื่อห้องเรียน","กลุ่มสาระ/วิชา","ครูผู้สอน","รหัสเข้าห้อง","จำนวนนักเรียน","จำนวนการบ้าน","ชิ้นงานที่ส่งแล้ว","วันที่สร้าง"\n';
      data.forEach((r) => {
        csvContent += `"${r.index}","${r.classroomName}","${r.subject}","${r.teacherName}","${r.code}","${r.studentCount}","${r.assignmentCount}","${r.submissionCount}","${r.createdAt}"\n`;
      });
      fileName = `ข้อมูลห้องเรียนและครูผู้สอน_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'assignments') {
      const data = generateAssignmentSheetData();
      csvContent += '"ลำดับ","ห้องเรียน","วิชา","หัวข้องาน","คะแนนเต็ม","จำนวนส่งแล้ว","ตรวจแล้ว","กำหนดส่ง","วันที่สั่งงาน"\n';
      data.forEach((r) => {
        csvContent += `"${r.index}","${r.classroom}","${r.subject}","${r.title}","${r.maxScore}","${r.submittedCount}","${r.gradedCount}","${r.dueDate}","${r.createdAt}"\n`;
      });
      fileName = `รายงานการบ้านและชิ้นงาน_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว`, 'success');
  };

  // Copy Tab-Separated Values for instant Ctrl+V into Google Sheets
  const handleCopyTableForSheets = (type: SheetReportType) => {
    let tsv = '';

    if (type === 'overview') {
      const data = generateOverviewSheetData();
      tsv += 'หัวข้อสถิติ\tจำนวน / ผลลัพธ์\tรายละเอียดเพิ่มเติม\n';
      data.forEach((r) => {
        tsv += `${r.metric}\t${r.value}\t${r.details}\n`;
      });
    } else if (type === 'students') {
      const data = generateStudentSheetData();
      tsv += 'ลำดับ\tรหัสนักเรียน\tชื่อ-นามสกุล\tระดับชั้น\tอีเมล\tแต้มสะสม\tเลเวล\tวันต่อเนื่อง\tส่งงานแล้ว\tวันที่ลงทะเบียน\n';
      data.forEach((r) => {
        tsv += `${r.index}\t${r.studentId}\t${r.name}\t${r.grade}\t${r.email}\t${r.totalPoints}\t${r.level}\t${r.streakDays}\t${r.submittedCount}\t${r.registeredAt}\n`;
      });
    } else if (type === 'teachers') {
      const data = generateTeacherSheetData();
      tsv += 'ลำดับ\tชื่อห้องเรียน\tกลุ่มสาระ/วิชา\tครูผู้สอน\tรหัสเข้าห้อง\tจำนวนนักเรียน\tจำนวนการบ้าน\tชิ้นงานที่ส่งแล้ว\tวันที่สร้าง\n';
      data.forEach((r) => {
        tsv += `${r.index}\t${r.classroomName}\t${r.subject}\t${r.teacherName}\t${r.code}\t${r.studentCount}\t${r.assignmentCount}\t${r.submissionCount}\t${r.createdAt}\n`;
      });
    } else if (type === 'assignments') {
      const data = generateAssignmentSheetData();
      tsv += 'ลำดับ\tห้องเรียน\tวิชา\tหัวข้องาน\tคะแนนเต็ม\tจำนวนส่งแล้ว\tตรวจแล้ว\tกำหนดส่ง\tวันที่สั่งงาน\n';
      data.forEach((r) => {
        tsv += `${r.index}\t${r.classroom}\t${r.subject}\t${r.title}\t${r.maxScore}\t${r.submittedCount}\t${r.gradedCount}\t${r.dueDate}\t${r.createdAt}\n`;
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setIsCopied(true);
      showToast('คัดลอกตารางแล้ว! สามารถเปิด Google Sheets แล้วกด Ctrl+V เพื่อวางได้ทันที', 'success');
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const data = {
      school: 'โรงเรียนไทยนิยมสงเคราะห์',
      exportedAt: new Date().toISOString(),
      stats: {
        totalUsers: allUsers.length,
        totalClassrooms: classrooms.length,
        totalAssignments: assignments.length,
        totalSubmissions: submissions.length,
      },
      users: allUsers,
      classrooms: classrooms,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thainiyom_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="admin-toast-banner"
          className={`fixed bottom-6 right-6 z-50 py-3 px-4 rounded-2xl shadow-xl border flex items-center gap-2.5 animate-fadeIn text-xs font-bold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-indigo-950 text-indigo-200 border-indigo-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner: School Admin Header */}
      <div className="rounded-3xl bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-800/60 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-30px] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-lg text-purple-300">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider">
                  Admin Control Panel
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cloud Firestore Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                ระบบบริหารจัดการกลาง (School Administration)
              </h1>
              <p className="text-xs text-purple-200/80 mt-0.5">
                โรงเรียนไทยนิยมสงเคราะห์ สำนักงานเขตบางเขน กทม. • สรุปรายงาน Google Sheets และจัดการระบบ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Google Sheets Report Button */}
            <button
              type="button"
              id="btn-admin-export-sheets"
              onClick={() => setIsExportSheetsModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer border border-emerald-500"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>สรุปรายงาน Google Sheets</span>
            </button>

            {/* Add User */}
            <button
              type="button"
              id="btn-admin-add-user"
              onClick={() => {
                setUserFormError(null);
                setUserFormSuccess(null);
                setIsAddUserOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผู้ใช้งาน</span>
            </button>

            {/* Create Classroom */}
            <button
              type="button"
              id="btn-admin-create-class"
              onClick={() => {
                if (onOpenCreateClassroom) {
                  onOpenCreateClassroom();
                } else {
                  setIsCreateClassModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-purple-300" />
              <span>สร้างห้องเรียนใหม่</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              id="btn-admin-refresh"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Announcement Alert Bar */}
        {announcementText && (
          <div className="mt-5 p-3 rounded-2xl bg-purple-950/60 border border-purple-700/50 flex items-center gap-3 text-xs text-purple-200">
            <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>ประกาศโรงเรียน:</strong> {announcementText}
            </span>
          </div>
        )}
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ผู้ใช้งานทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{allUsers.length}</span>
            <span className="text-xs text-slate-500">บัญชี</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
            <span className="text-indigo-600 font-semibold">{teacherCount} ครู</span>
            <span>•</span>
            <span className="text-teal-600 font-semibold">{studentCount} นักเรียน</span>
            <span>•</span>
            <span className="text-purple-600 font-semibold">{adminCount} แอดมิน</span>
          </div>
        </div>

        {/* Card 2: Total Classrooms */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ห้องเรียนทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{classrooms.length}</span>
            <span className="text-xs text-slate-500">ห้องเรียน</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            ครอบคลุมทุกระดับชั้นและกลุ่มสาระการเรียนรู้
          </p>
        </div>

        {/* Card 3: Total Assignments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ภาระงาน & การบ้าน</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{assignments.length}</span>
            <span className="text-xs text-slate-500">ชิ้นงาน</span>
          </div>
          <p className="mt-2 text-[11px] text-teal-700 font-medium">
            ส่งแล้ว {submissions.length} รายการ
          </p>
        </div>

        {/* Card 4: Database & Google Sheets Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รายงาน Google Sheets</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-emerald-700">พร้อมส่งออก 4 รายงาน</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>รองรับ CSV และ Ctrl+V วางในชีต</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Admin */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>จัดการผู้ใช้งาน ({allUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classrooms')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'classrooms'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <School className="w-4 h-4" />
          <span>ห้องเรียนทั้งหมด ({classrooms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>สรุปรายงาน Google Sheets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่าระบบ & ประกาศโรงเรียน</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USER MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามชื่อ, อีเมล, รหัสนักเรียน, หรือระดับชั้น..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  roleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({allUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('teacher')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  roleFilter === 'teacher' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ครู ({teacherCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('student')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  roleFilter === 'student' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                นักเรียน ({studentCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แอดมิน ({adminCount})
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">ผู้ใช้งาน</th>
                  <th className="py-3 px-4">อีเมล / ไอดี</th>
                  <th className="py-3 px-4">บทบาท (Role)</th>
                  <th className="py-3 px-4">ระดับชั้น / วิชา</th>
                  <th className="py-3 px-4 text-center">แต้ม & เลเวล</th>
                  <th className="py-3 px-4 text-right">การจัดการ & แก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {u.name.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
                                    คุณ
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 10)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-700 font-medium">{u.email}</span>
                          {u.studentId && (
                            <div className="text-[10px] text-teal-700 font-medium">รหัสนักเรียน: {u.studentId}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : u.role === 'teacher'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-teal-100 text-teal-800 border border-teal-200'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3 text-purple-600" />}
                            {u.role === 'teacher' && <GraduationCap className="w-3 h-3 text-indigo-600" />}
                            {u.role === 'student' && <BookOpen className="w-3 h-3 text-teal-600" />}
                            <span>
                              {u.role === 'admin' ? 'ผู้ดูแลระบบ' : u.role === 'teacher' ? 'คุณครู' : 'นักเรียน'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {u.role === 'student' ? (
                            <span>{u.grade || 'ม.3/1'}</span>
                          ) : (
                            <span>{u.subject || u.department || 'ทั่วไป'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-amber-600">{u.totalPoints || 0} แต้ม</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">(Lv.{u.level || 1})</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View User details */}
                            <button
                              type="button"
                              onClick={() => handleViewUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="ดูข้อมูลละเอียด"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit User Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลผู้ใช้ & รหัสผ่าน"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Change role selector */}
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleChangeRolePrompt(u, e.target.value as UserRole)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                              title="เปลี่ยนบทบาทผู้ใช้"
                            >
                              <option value="student">นักเรียน</option>
                              <option value="teacher">คุณครู</option>
                              <option value="admin">ผู้ดูแลระบบ</option>
                            </select>

                            {/* Delete User */}
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleDeleteUserPrompt(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 cursor-pointer"
                              title={isSelf ? 'ไม่สามารถลบบัญชีตนเองได้' : 'ลบผู้ใช้งาน'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CLASSROOMS */}
      {/* ========================================================= */}
      {activeTab === 'classrooms' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              ห้องเรียนทั้งหมดในโรงเรียน ({classrooms.length} ห้อง)
            </h3>
            <button
              type="button"
              onClick={() => {
                if (onOpenCreateClassroom) {
                  onOpenCreateClassroom();
                } else {
                  setIsCreateClassModalOpen(true);
                }
              }}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างห้องเรียนใหม่</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {classrooms.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีห้องเรียนในระบบ คลิกปุ่ม "สร้างห้องเรียนใหม่" เพื่อเริ่มต้น
              </div>
            ) : (
              classrooms.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs bg-linear-to-tr from-blue-600 to-indigo-700"
                    >
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          รหัส: {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        วิชา: <span className="font-semibold text-slate-800">{c.subject}</span> • ครูผู้สอน:{' '}
                        <span className="font-semibold text-slate-800">{c.teacherName}</span>
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>นักเรียนในห้อง: {c.studentIds?.length || 0} คน</span>
                        <span>•</span>
                        <span>สร้างเมื่อ: {new Date(c.createdAt).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectClassroom(c)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>เข้าตรวจห้องเรียน</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClassroomPrompt(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="ลบห้องเรียน"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GOOGLE SHEETS REPORT GENERATOR */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    ระบบส่งออกและสรุปรายงานเป็น Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500">
                    ดาวน์โหลดไฟล์ CSV หรือคัดลอกตารางเพื่อกด Ctrl+V วางใน Google Sheets ได้ทันที
                  </p>
                </div>
              </div>

              {/* Action Buttons for Sheets */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://docs.google.com/spreadsheets/u/0/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Google Sheets ใหม่</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyTableForSheets(reportType)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'คัดลอกสำเร็จ!' : 'คัดลอกตาราง (วางใน Sheets)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCSV(reportType)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์ CSV</span>
                </button>
              </div>
            </div>

            {/* Step-by-step Quick Help */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>วิธีใช้งานกับ Google Sheets ใน 2 วินาที:</strong>{' '}
                1. คลิกปุ่ม <em>"เปิด Google Sheets ใหม่"</em> เพื่อเปิดแท็บสเปรดชีตว่าง &nbsp;|&nbsp; 2. คลิกปุ่ม <em>"คัดลอกตาราง"</em> &nbsp;|&nbsp; 3. กด <strong>Ctrl + V</strong> (หรือ Command + V บน Mac) ในช่อง A1 ของ Google Sheets ตารางและภาษาไทยจะถูกจัดวางอย่างสมบูรณ์แบบ!
              </div>
            </div>

            {/* Report Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportType('overview')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'overview'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. สรุปภาพรวมโรงเรียน</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">สถิติผู้ใช้ ห้องเรียน ชิ้นงาน</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('students')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'students'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                  <span>2. รายชื่อนักเรียน & แต้ม</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">คะแนนสะสม เลเวล การส่งงาน</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('teachers')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'teachers'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. ครู & ห้องเรียนทั้งหมด</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">กลุ่มสาระ รหัสห้อง นักเรียน</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('assignments')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'assignments'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>4. การบ้าน & การส่งงาน</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">คะแนนเต็ม จำนวนที่ส่งแล้ว</div>
              </button>
            </div>

            {/* Table Preview */}
            <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>
                  ตัวอย่างข้อมูลสำหรับนำเข้า Google Sheets (
                  {reportType === 'overview'
                    ? 'ภาพรวมโรงเรียน'
                    : reportType === 'students'
                    ? `นักเรียน ${studentCount} คน`
                    : reportType === 'teachers'
                    ? `ห้องเรียน ${classrooms.length} ห้อง`
                    : `การบ้าน ${assignments.length} รายการ`}
                  )
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  เข้ารหัส UTF-8 พร้อม BOM ภาษาไทยไม่เพี้ยน
                </span>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto text-xs">
                {reportType === 'overview' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4">หัวข้อสถิติ</th>
                        <th className="py-2.5 px-4">จำนวน / ผลลัพธ์</th>
                        <th className="py-2.5 px-4">รายละเอียดเพิ่มเติม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generateOverviewSheetData().map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{r.metric}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">{r.value}</td>
                          <td className="py-2.5 px-4 text-slate-500">{r.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'students' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">ลำดับ</th>
                        <th className="py-2.5 px-3">รหัสนักเรียน</th>
                        <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                        <th className="py-2.5 px-3">ระดับชั้น</th>
                        <th className="py-2.5 px-3">อีเมล</th>
                        <th className="py-2.5 px-3 text-center">แต้มสะสม</th>
                        <th className="py-2.5 px-3 text-center">เลเวล</th>
                        <th className="py-2.5 px-3 text-center">ส่งงานแล้ว</th>
                        <th className="py-2.5 px-3">วันที่ลงทะเบียน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generateStudentSheetData().map((s) => (
                        <tr key={s.index} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500">{s.index}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{s.studentId}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.grade}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.email}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-600">{s.totalPoints}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{s.level}</td>
                          <td className="py-2.5 px-3 text-center text-teal-700 font-semibold">{s.submittedCount} งาน</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.registeredAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'teachers' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">ลำดับ</th>
                        <th className="py-2.5 px-3">ชื่อห้องเรียน</th>
                        <th className="py-2.5 px-3">กลุ่มสาระ / วิชา</th>
                        <th className="py-2.5 px-3">ครูผู้สอน</th>
                        <th className="py-2.5 px-3">รหัสเข้าห้อง</th>
                        <th className="py-2.5 px-3 text-center">นักเรียน</th>
                        <th className="py-2.5 px-3 text-center">การบ้าน</th>
                        <th className="py-2.5 px-3 text-center">ชิ้นงานที่ส่ง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generateTeacherSheetData().map((t) => (
                        <tr key={t.index} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500">{t.index}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{t.classroomName}</td>
                          <td className="py-2.5 px-3 text-indigo-700 font-medium">{t.subject}</td>
                          <td className="py-2.5 px-3 text-slate-800">{t.teacherName}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{t.code}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">{t.studentCount} คน</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{t.assignmentCount} ชิ้น</td>
                          <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t.submissionCount} ชิ้น</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'assignments' && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">ลำดับ</th>
                        <th className="py-2.5 px-3">ห้องเรียน</th>
                        <th className="py-2.5 px-3">วิชา</th>
                        <th className="py-2.5 px-3">หัวข้องาน</th>
                        <th className="py-2.5 px-3 text-center">คะแนนเต็ม</th>
                        <th className="py-2.5 px-3 text-center">ส่งแล้ว</th>
                        <th className="py-2.5 px-3 text-center">ตรวจแล้ว</th>
                        <th className="py-2.5 px-3">กำหนดส่ง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generateAssignmentSheetData().map((a) => (
                        <tr key={a.index} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500">{a.index}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{a.classroom}</td>
                          <td className="py-2.5 px-3 text-slate-600">{a.subject}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{a.title}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-600">{a.maxScore}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-blue-700">{a.submittedCount} คน</td>
                          <td className="py-2.5 px-3 text-center text-emerald-700">{a.gradedCount} คน</td>
                          <td className="py-2.5 px-3 text-slate-500">{a.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SETTINGS & ANNOUNCEMENTS */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Broadcast Announcement */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">ประกาศข่าวสารโรงเรียนไทยนิยมสงเคราะห์</h3>
                <p className="text-[11px] text-slate-500">ข้อความนี้จะแสดงในส่วนหัวของแอปพลิเคชันสำหรับทุกคน</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อความประกาศ (Broadcast Announcement)
              </label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="พิมพ์ข้อความประกาศของโรงเรียน เช่น กำหนดการสอบปลายภาค, การส่งงาน, ฯลฯ"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                {announcementSaved ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกและเผยแพร่เรียบร้อย
                  </span>
                ) : (
                  'คลิกบันทึกเพื่ออัปเดตประกาศทันที'
                )}
              </span>
              <button
                type="button"
                onClick={handleSaveAnnouncement}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                บันทึกประกาศ
              </button>
            </div>
          </div>

          {/* Card: Backup & Google Sheets Export */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">สำรองข้อมูล & ตรวจสอบระบบ</h3>
                <p className="text-[11px] text-slate-500">ส่งออกข้อมูลทั้งหมดเพื่อเก็บรักษาความปลอดภัย</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                คุณสามารถส่งออกข้อมูลทั้งหมดเป็น Google Sheets หรือสำรองข้อมูลไฟล์ JSON ของโรงเรียน รวมถึงรายชื่อผู้ใช้ทั้งหมด, ห้องเรียน, และข้อมูลการศึกษา
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>ผู้ใช้งานทั้งหมด:</span>
                  <span className="font-bold text-slate-800">{allUsers.length} บัญชี</span>
                </div>
                <div className="flex justify-between">
                  <span>ห้องเรียนทั้งหมด:</span>
                  <span className="font-bold text-slate-800">{classrooms.length} ห้อง</span>
                </div>
                <div className="flex justify-between">
                  <span>การบ้าน & ชิ้นงาน:</span>
                  <span className="font-bold text-slate-800">{assignments.length} รายการ</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsExportSheetsModalOpen(true)}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>สรุปรายงาน Google Sheets</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดสำรอง JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD USER */}
      {/* ========================================================= */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-left">
            <div className="p-5 bg-linear-to-r from-purple-800 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">เพิ่มผู้ใช้งานใหม่ในระบบ</h3>
                  <p className="text-[11px] text-purple-200">สร้างบัญชีสำหรับครู นักเรียน หรือผู้ดูแลระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {userFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {userFormSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userFormSuccess}</span>
                </div>
              )}

              {/* Role selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  บทบาทผู้ใช้งาน <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('teacher')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      newUserRole === 'teacher'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>คุณครู</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('student')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      newUserRole === 'student'
                        ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>นักเรียน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('admin')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      newUserRole === 'admin'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>แอดมิน</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="เช่น ครูสมชาย ใจดี หรือ ด.ช.วิชัย สดใส"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Email or ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล หรือ เลขประจำตัวนักเรียน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="เช่น somchai@thainiyom.ac.th หรือ 65001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านเริ่มต้น (Default: 123456)
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Role specific fields */}
              {newUserRole === 'student' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับชั้น</label>
                    <input
                      type="text"
                      value={newUserGrade}
                      onChange={(e) => setNewUserGrade(e.target.value)}
                      placeholder="ม.3/1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสนักเรียน</label>
                    <input
                      type="text"
                      value={newUserStudentId}
                      onChange={(e) => setNewUserStudentId(e.target.value)}
                      placeholder="เช่น 65001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ) : newUserRole === 'teacher' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                  <input
                    type="text"
                    value={newUserSubject}
                    onChange={(e) => setNewUserSubject(e.target.value)}
                    placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย / หน่วยงานที่สังกัด</label>
                  <input
                    type="text"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    placeholder="เช่น ศูนย์เทคโนโลยีและสารสนเทศ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  {isSavingUser ? 'กำลังบันทึก...' : 'ยืนยันเพิ่มผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT USER */}
      {/* ========================================================= */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-left">
            <div className="p-5 bg-linear-to-r from-purple-800 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">แก้ไขข้อมูลผู้ใช้งาน</h3>
                  <p className="text-[11px] text-purple-200">แก้ไขบทบาท ข้อมูลประจำตัว และรหัสผ่าน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUserOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Role selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">บทบาทผู้ใช้งาน</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('teacher')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      editRole === 'teacher'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>คุณครู</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('student')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      editRole === 'student'
                        ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>นักเรียน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      editRole === 'admin'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-2xs'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>แอดมิน</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลผู้ใช้งาน</label>
                <input
                  type="text"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน (ตั้งใหม่เพื่อรีเซ็ต)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่หากต้องการเปลี่ยน"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Role specific */}
              {editRole === 'student' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับชั้น</label>
                    <input
                      type="text"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      placeholder="เช่น ม.3/1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสนักเรียน</label>
                    <input
                      type="text"
                      value={editStudentId}
                      onChange={(e) => setEditStudentId(e.target.value)}
                      placeholder="เช่น 65001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ) : editRole === 'teacher' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="เช่น วิทยาศาสตร์, คณิตศาสตร์"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย / งานที่สังกัด</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="เช่น ศูนย์เทคโนโลยีสารสนเทศ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* Points & Level */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">แต้มความดีสะสม</label>
                  <input
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับเลเวล (Level)</label>
                  <input
                    type="number"
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW USER DETAILS */}
      {/* ========================================================= */}
      {isViewUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-left">
            <div className="p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-sm">
                  {selectedUser.name.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{selectedUser.name}</h3>
                  <p className="text-[11px] text-slate-300">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewUserOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">บทบาทในระบบ</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedUser.role === 'admin'
                      ? 'ผู้ดูแลระบบ (Admin)'
                      : selectedUser.role === 'teacher'
                      ? 'คุณครูผู้สอน'
                      : 'นักเรียน'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">แต้มสะสม / เลเวล</span>
                  <span className="font-bold text-amber-600 text-sm">
                    {selectedUser.totalPoints || 0} แต้ม (Lv.{selectedUser.level || 1})
                  </span>
                </div>
                {selectedUser.studentId && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">รหัสนักเรียน</span>
                    <span className="font-bold text-teal-700">{selectedUser.studentId}</span>
                  </div>
                )}
                {selectedUser.grade && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">ระดับชั้น</span>
                    <span className="font-bold text-slate-800">{selectedUser.grade}</span>
                  </div>
                )}
                {selectedUser.subject && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">กลุ่มสาระการเรียนรู้</span>
                    <span className="font-bold text-indigo-700">{selectedUser.subject}</span>
                  </div>
                )}
                {selectedUser.department && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">ฝ่ายที่สังกัด</span>
                    <span className="font-bold text-purple-700">{selectedUser.department}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>ไอดีผู้ใช้ (ID):</span>
                  <span className="font-mono text-slate-800">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>วันที่สร้างบัญชี:</span>
                  <span className="text-slate-800">{new Date(selectedUser.createdAt).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>รหัสผ่านที่บันทึก:</span>
                  <span className="font-mono text-slate-800">{selectedUser.password || '(ยังไม่ตั้งรหัส)'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewUserOpen(false);
                    handleOpenEditUser(selectedUser);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลผู้ใช้นี้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE CLASSROOM */}
      {/* ========================================================= */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-left">
            <div className="p-5 bg-linear-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">สร้างห้องเรียนใหม่ (Admin)</h3>
                  <p className="text-[11px] text-blue-200">สร้างห้องเรียนพร้อมกำหนดรหัสให้นักเรียนเข้าร่วม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateClassModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInternalCreateClass} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อห้องเรียน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="เช่น วิทยาศาสตร์ ม.3/1 หรือ คอมพิวเตอร์ ม.2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มสาระ / วิชา</label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="เช่น วิทยาศาสตร์"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสห้องเรียน (6 หลัก)</label>
                  <input
                    type="text"
                    required
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">คุณครูผู้สอน</label>
                <input
                  type="text"
                  value={newClassTeacherName}
                  onChange={(e) => setNewClassTeacherName(e.target.value)}
                  placeholder="เช่น ครูสมชาย ใจดี"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ตารางสอน / เวลาเรียน</label>
                <input
                  type="text"
                  value={newClassSchedule}
                  onChange={(e) => setNewClassSchedule(e.target.value)}
                  placeholder="เช่น ทุกวันอังคารและพฤหัส 09.30 - 11.00 น."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  {isCreatingClass ? 'กำลังสร้าง...' : 'สร้างห้องเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: GOOGLE SHEETS EXPORT MODAL */}
      {/* ========================================================= */}
      {isExportSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-left">
            <div className="p-5 bg-linear-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">สรุปรายงานเป็น Google Sheets</h3>
                  <p className="text-[11px] text-emerald-200">โรงเรียนไทยนิยมสงเคราะห์ • ส่งออกและซิงค์ข้อมูลสเปรดชีต</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportSheetsModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                💡 <strong>วิธีนำเข้า Google Sheets ทันใจ:</strong> กดปุ่ม <em>"เปิด Google Sheets"</em> ด้านล่างเพื่อเปิดชีตใหม่ แล้วกด <em>"คัดลอกตาราง"</em> จากนั้นกด <strong>Ctrl+V</strong> ใน Google Sheets ข้อมูลจะเรียงคอลัมน์ให้อย่างสวยงามทันที!
              </div>

              {/* Select Report Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">เลือกชุดรายงานที่ต้องการสรุป:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportType('overview')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      reportType === 'overview'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">1. สรุปภาพรวมโรงเรียน</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">ผู้ใช้ ห้องเรียน ชิ้นงานทั้งหมด</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('students')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      reportType === 'students'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">2. รายชื่อนักเรียน & คะแนน</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">รหัสนักเรียน ชั้น แต้ม เลเวล</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('teachers')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      reportType === 'teachers'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">3. ห้องเรียน & ครูผู้สอน</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">กลุ่มสาระ รหัสห้อง นักเรียน</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('assignments')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      reportType === 'assignments'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">4. การบ้าน & ชิ้นงาน</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">คะแนนเต็ม จำนวนที่ส่งแล้ว</div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <a
                  href="https://docs.google.com/spreadsheets/u/0/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Google Sheets ใหม่</span>
                </a>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleCopyTableForSheets(reportType)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกตาราง (Ctrl+V)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadCSV(reportType)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP CONFIRMATION DIALOG */}
      {/* ========================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer ${
                  confirmDialog.confirmColor || 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {confirmDialog.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

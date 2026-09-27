import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, User as FirebaseUser, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from '../lib/firebase';
import {
  getUserProfile,
  getUserByEmail,
  getUserByEmailOrStudentId,
  saveUserProfile,
  enrollStudentInDefaultClassrooms,
  createClassroom,
} from '../services/firestoreService';
import type { UserProfile, UserRole, Classroom } from '../types';

interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  grade?: string;
  studentId?: string;
  subject?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithCredentials: (emailOrId: string, pass: string) => Promise<void>;
  registerNewUser: (params: RegisterParams) => Promise<void>;
  loginGoogle: (preferredRole?: UserRole) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<void>;
  loginWithCustomProfile: (name: string, email: string, role: UserRole, grade?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_TEACHER: UserProfile = {
  id: 'teacher_somchai_01',
  email: 'somchai.teacher@thainiyom.ac.th',
  name: 'ครูสมชาย ใจดี',
  role: 'teacher',
  subject: 'วิทยาศาสตร์และเทคโนโลยี',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  totalPoints: 1200,
  level: 6,
  createdAt: new Date().toISOString(),
};

const DEMO_STUDENT: UserProfile = {
  id: 'std_65001',
  email: 'somying.edu@thainiyom.ac.th',
  name: 'ด.ญ. สมหญิง รักเรียน',
  role: 'student',
  studentId: '65001',
  grade: 'ม.3/1',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  totalPoints: 520,
  level: 3,
  streakDays: 7,
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('eduvibe_current_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for redirect result from Google OAuth (useful on mobile or when popup was blocked)
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) {
          setFirebaseUser(cred.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check notice:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        let profile = await getUserProfile(fbUser.uid);
        if (!profile && fbUser.email) {
          profile = await getUserByEmailOrStudentId(fbUser.email);
        }
        if (!profile) {
          // Check if there was a pending registration role/info saved in session
          const pendingStr = sessionStorage.getItem('eduvibe_pending_reg');
          let pendingRole: UserRole = 'student';
          let pendingName = fbUser.displayName || 'ผู้ใช้งาน โรงเรียนไทยนิยมสงเคราะห์';
          let pendingGrade = 'ม.3/1';
          let pendingStudentId = `STD${Math.floor(10000 + Math.random() * 90000)}`;
          let pendingSubject = 'วิทยาศาสตร์และเทคโนโลยี';

          if (pendingStr) {
            try {
              const parsed = JSON.parse(pendingStr);
              if (parsed.role) pendingRole = parsed.role;
              if (parsed.name) pendingName = parsed.name;
              if (parsed.grade) pendingGrade = parsed.grade;
              if (parsed.studentId) pendingStudentId = parsed.studentId;
              if (parsed.subject) pendingSubject = parsed.subject;
            } catch {
              // ignore
            }
          }

          profile = {
            id: fbUser.uid,
            email: (fbUser.email || 'user@thainiyom.ac.th').toLowerCase().trim(),
            name: pendingName,
            role: pendingRole,
            grade: pendingRole === 'student' ? pendingGrade : undefined,
            studentId: pendingRole === 'student' ? pendingStudentId : undefined,
            subject: pendingRole === 'teacher' ? pendingSubject : undefined,
            avatar:
              pendingRole === 'teacher'
                ? (fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
                : (fbUser.photoURL || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
            totalPoints: pendingRole === 'student' ? 100 : 500,
            level: 1,
            streakDays: pendingRole === 'student' ? 1 : 0,
            createdAt: new Date().toISOString(),
          };
          await saveUserProfile(profile);
          sessionStorage.removeItem('eduvibe_pending_reg');

          if (pendingRole === 'teacher') {
            const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const teacherClassroom: Classroom = {
              id: `cls_${profile.id}`,
              name: `ห้องเรียน ${profile.name} (${profile.subject || 'กลุ่มสาระการเรียนรู้'})`,
              subject: profile.subject || 'วิชาทั่วไป',
              code: classCode,
              teacherId: profile.id,
              teacherName: profile.name,
              description: `ห้องเรียนออนไลน์วิชา${profile.subject || 'ทั่วไป'} โดยคุณครู${profile.name}`,
              color: 'from-blue-600 to-indigo-700',
              studentIds: [],
              schedule: 'ตามตารางสอน',
              createdAt: new Date().toISOString(),
            };
            await createClassroom(teacherClassroom);
          }
        }
        setCurrentUser(profile);
        localStorage.setItem('eduvibe_current_user', JSON.stringify(profile));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithCredentials = async (emailOrId: string, pass: string) => {
    setLoading(true);
    try {
      const cleanInput = emailOrId.trim();
      const cleanLower = cleanInput.toLowerCase();

      // Quick Demo Shortcuts (Thainiyom School)
      if (
        cleanLower === 'somchai.teacher@thainiyom.ac.th' ||
        cleanLower === 'somchai.teacher@school.ac.th' ||
        cleanLower === 'somchai' ||
        cleanLower === 'teacher'
      ) {
        setCurrentUser(DEMO_TEACHER);
        localStorage.setItem('eduvibe_current_user', JSON.stringify(DEMO_TEACHER));
        return;
      }
      if (
        cleanLower === 'somying.edu@thainiyom.ac.th' ||
        cleanLower === 'somying.edu@school.ac.th' ||
        cleanLower === 'somying' ||
        cleanLower === 'student' ||
        cleanInput === '65001'
      ) {
        setCurrentUser(DEMO_STUDENT);
        localStorage.setItem('eduvibe_current_user', JSON.stringify(DEMO_STUDENT));
        return;
      }

      let profile: UserProfile | null = null;
      let authError: any = null;

      // 1. If it looks like an email address, try Firebase Auth first
      if (cleanLower.includes('@')) {
        try {
          const fbUser = await loginWithEmail(cleanLower, pass);
          if (fbUser) {
            profile = await getUserProfile(fbUser.uid);
            if (!profile && fbUser.email) {
              profile = await getUserByEmailOrStudentId(fbUser.email);
            }
          }
        } catch (err: any) {
          authError = err;
        }
      }

      // 2. Query Firestore / local cache for matching account by email, studentId, or ID
      if (!profile) {
        profile = await getUserByEmailOrStudentId(cleanInput);
        if (profile) {
          // If profile has stored password, verify it
          if (profile.password && profile.password !== pass) {
            throw new Error('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
          }
        }
      }

      if (!profile) {
        if (authError?.code === 'auth/wrong-password' || authError?.code === 'auth/invalid-credential') {
          throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        } else if (authError?.code === 'auth/user-not-found') {
          throw new Error('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาสมัครสมาชิกใหม่');
        } else if (authError?.code === 'auth/invalid-email') {
          throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
        } else {
          throw new Error('ไม่พบบัญชีผู้ใช้นี้ หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลหรือสมัครสมาชิกใหม่');
        }
      }

      setCurrentUser(profile);
      localStorage.setItem('eduvibe_current_user', JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  const registerNewUser = async ({
    name,
    email,
    password,
    role,
    grade,
    studentId,
    subject,
  }: RegisterParams) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      if (!cleanName) throw new Error('กรุณาระบุชื่อ-นามสกุล');
      if (!cleanEmail) throw new Error('กรุณาระบุอีเมล');
      if (password.length < 6) throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

      // Check if already registered in Firestore or local
      const existing = await getUserByEmailOrStudentId(cleanEmail);
      if (existing) {
        throw new Error('อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาเข้าสู่ระบบ');
      }

      // Store pending registration parameters into sessionStorage
      const pendingData = {
        role,
        name: cleanName,
        grade: grade?.trim() || 'ม.3/1',
        studentId: studentId?.trim() || `STD${Math.floor(10000 + Math.random() * 90000)}`,
        subject: subject?.trim() || 'วิทยาศาสตร์และเทคโนโลยี',
      };
      sessionStorage.setItem('eduvibe_pending_reg', JSON.stringify(pendingData));

      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const fbUser = await registerWithEmail(cleanEmail, password, cleanName);
        if (fbUser) {
          uid = fbUser.uid;
        }
      } catch (fbErr: any) {
        console.warn('Firebase Auth register notice:', fbErr);
        if (fbErr.code === 'auth/email-already-in-use') {
          sessionStorage.removeItem('eduvibe_pending_reg');
          throw new Error('อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาเข้าสู่ระบบ');
        }
      }

      const newProfile: UserProfile = {
        id: uid,
        email: cleanEmail,
        name: cleanName,
        role,
        grade: role === 'student' ? (grade?.trim() || 'ม.3/1') : undefined,
        studentId: role === 'student' ? (studentId?.trim() || `STD${Math.floor(10000 + Math.random() * 90000)}`) : undefined,
        subject: role === 'teacher' ? (subject?.trim() || 'วิชาทั่วไป') : undefined,
        password,
        avatar:
          role === 'teacher'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        totalPoints: role === 'student' ? 100 : 500,
        level: 1,
        streakDays: role === 'student' ? 1 : 0,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(newProfile);

      // New users start completely clean with zero classrooms.
      // Teachers create their classrooms on demand, and students join using their room code.

      setCurrentUser(newProfile);
      localStorage.setItem('eduvibe_current_user', JSON.stringify(newProfile));
      sessionStorage.removeItem('eduvibe_pending_reg');
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async (preferredRole?: UserRole) => {
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      let profile = await getUserProfile(fbUser.uid);
      if (!profile && fbUser.email) {
        profile = await getUserByEmailOrStudentId(fbUser.email);
      }
      if (!profile) {
        const roleToUse: UserRole = preferredRole || 'teacher';
        profile = {
          id: fbUser.uid,
          email: (fbUser.email || '').toLowerCase().trim(),
          name: fbUser.displayName || 'สมาชิก โรงเรียนไทยนิยมสงเคราะห์',
          role: roleToUse,
          subject: roleToUse === 'teacher' ? 'วิชาทั่วไป' : undefined,
          grade: roleToUse === 'student' ? 'ม.3/1' : undefined,
          studentId: roleToUse === 'student' ? `STD${Math.floor(10000 + Math.random() * 90000)}` : undefined,
          avatar:
            fbUser.photoURL ||
            (roleToUse === 'teacher'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
          totalPoints: roleToUse === 'student' ? 100 : 500,
          level: 1,
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(profile);
      }
      setCurrentUser(profile);
      localStorage.setItem('eduvibe_current_user', JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async (role: UserRole) => {
    const demo = role === 'teacher' ? DEMO_TEACHER : DEMO_STUDENT;
    await saveUserProfile(demo);
    setCurrentUser(demo);
    localStorage.setItem('eduvibe_current_user', JSON.stringify(demo));
  };

  const loginWithCustomProfile = async (
    name: string,
    email: string,
    role: UserRole,
    grade?: string
  ) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail) {
        const existing = await getUserByEmailOrStudentId(cleanEmail);
        if (existing) {
          setCurrentUser(existing);
          localStorage.setItem('eduvibe_current_user', JSON.stringify(existing));
          return;
        }
      }

      const generatedId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanName = name.trim() || (role === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน');
      const emailToUse = cleanEmail || `${generatedId}@thainiyom.ac.th`;
      const newProfile: UserProfile = {
        id: generatedId,
        email: emailToUse,
        name: cleanName,
        role,
        grade: grade?.trim() || (role === 'student' ? 'ม.3/1' : undefined),
        avatar:
          role === 'teacher'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        totalPoints: role === 'student' ? 100 : 500,
        level: 1,
        streakDays: role === 'student' ? 1 : 0,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(newProfile);
      setCurrentUser(newProfile);
      localStorage.setItem('eduvibe_current_user', JSON.stringify(newProfile));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('eduvibe_current_user');
  };

  const updateRole = async (role: UserRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role };
    setCurrentUser(updated);
    localStorage.setItem('eduvibe_current_user', JSON.stringify(updated));
    await saveUserProfile(updated);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem('eduvibe_current_user', JSON.stringify(updated));

    // Update Firebase Auth user if available
    try {
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: data.name !== undefined ? data.name : auth.currentUser.displayName,
          photoURL: data.avatar !== undefined ? data.avatar : auth.currentUser.photoURL,
        });
      }
    } catch (fbErr) {
      console.warn('Firebase Auth update profile warning:', fbErr);
    }

    await saveUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        loginWithCredentials,
        registerNewUser,
        loginGoogle,
        loginDemo,
        loginWithCustomProfile,
        logout,
        updateRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

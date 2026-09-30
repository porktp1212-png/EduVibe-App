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
  department?: string;
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

export const DEMO_ADMIN: UserProfile = {
  id: 'admin_thainiyom_01',
  email: 'admin@thainiyom.ac.th',
  name: 'ผู้ดูแลระบบกลาง (Admin)',
  role: 'admin',
  department: 'ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  totalPoints: 9999,
  level: 99,
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
        cleanLower === 'admin@thainiyom.ac.th' ||
        cleanLower === 'admin'
      ) {
        setCurrentUser(DEMO_ADMIN);
        localStorage.setItem('eduvibe_current_user', JSON.stringify(DEMO_ADMIN));
        await saveUserProfile(DEMO_ADMIN);
        return;
      }
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
        if (!profile && !cleanLower.includes('@')) {
          profile = await getUserByEmailOrStudentId(`${cleanLower}@thainiyom.ac.th`);
        }

        if (profile) {
          // If profile has stored password, verify it
          if (profile.password && profile.password !== pass) {
            throw new Error('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
          }
          // If profile didn't have password set yet, save it now for seamless future logins
          if (!profile.password) {
            profile.password = pass;
            saveUserProfile(profile).catch(() => {});
          }
        }
      }

      if (!profile) {
        if (authError?.code === 'auth/wrong-password' || authError?.code === 'auth/invalid-credential') {
          throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
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
    department,
  }: RegisterParams) => {
    setLoading(true);
    try {
      const cleanName = name.trim();
      let cleanInput = email.trim();
      let cleanEmail = cleanInput.toLowerCase();

      if (!cleanName) throw new Error('กรุณาระบุชื่อ-นามสกุล');
      if (!cleanInput) throw new Error('กรุณาระบุอีเมล หรือเลขประจำตัวนักเรียน');
      if (password.length < 6) throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

      // If user provided a username or studentId without @, standardize to school domain
      if (!cleanEmail.includes('@')) {
        cleanEmail = `${cleanEmail.replace(/\s+/g, '')}@thainiyom.ac.th`;
      }

      const resolvedStudentId =
        studentId?.trim() ||
        (/^\d+$/.test(cleanInput) ? cleanInput : `STD${Math.floor(10000 + Math.random() * 90000)}`);

      // Check if user already exists in Firestore or local database
      const existing = await getUserByEmailOrStudentId(cleanEmail);
      if (existing) {
        // Smoothly activate or update credentials and log in directly
        const updatedProfile: UserProfile = {
          ...existing,
          name: cleanName || existing.name,
          role: role || existing.role,
          password,
          department: role === 'admin' ? (department?.trim() || existing.department || 'ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์') : existing.department,
          grade: role === 'student' ? (grade?.trim() || existing.grade || 'ม.3/1') : existing.grade,
          studentId: role === 'student' ? (resolvedStudentId || existing.studentId) : existing.studentId,
          subject: role === 'teacher' ? (subject?.trim() || existing.subject || 'วิทยาศาสตร์และเทคโนโลยี') : existing.subject,
        };
        await saveUserProfile(updatedProfile);
        setCurrentUser(updatedProfile);
        localStorage.setItem('eduvibe_current_user', JSON.stringify(updatedProfile));
        sessionStorage.removeItem('eduvibe_pending_reg');
        return;
      }

      // Store pending registration parameters into sessionStorage
      const pendingData = {
        role,
        name: cleanName,
        grade: grade?.trim() || 'ม.3/1',
        studentId: resolvedStudentId,
        subject: subject?.trim() || 'วิทยาศาสตร์และเทคโนโลยี',
        department: department?.trim() || 'ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์',
      };
      sessionStorage.setItem('eduvibe_pending_reg', JSON.stringify(pendingData));

      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const fbUser = await registerWithEmail(cleanEmail, password, cleanName);
        if (fbUser) {
          uid = fbUser.uid;
        }
      } catch (fbErr: any) {
        // Firebase Auth may have email-password disabled in console (auth/operation-not-allowed)
        // or rate limited. We safely fallback to direct Firestore profile management.
        console.warn('Firebase Auth register notice (using Firestore):', fbErr?.message || fbErr);
      }

      const newProfile: UserProfile = {
        id: uid,
        email: cleanEmail,
        name: cleanName,
        role,
        department: role === 'admin' ? (department?.trim() || 'ศูนย์เทคโนโลยีและสารสนเทศ โรงเรียนไทยนิยมสงเคราะห์') : undefined,
        grade: role === 'student' ? (grade?.trim() || 'ม.3/1') : undefined,
        studentId: role === 'student' ? resolvedStudentId : undefined,
        subject: role === 'teacher' ? (subject?.trim() || 'วิทยาศาสตร์และเทคโนโลยี') : undefined,
        password,
        avatar:
          role === 'admin'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            : role === 'teacher'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        totalPoints: role === 'admin' ? 9999 : role === 'student' ? 100 : 500,
        level: role === 'admin' ? 99 : 1,
        streakDays: role === 'student' ? 1 : 0,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(newProfile);

      // If registered as teacher, automatically create their starter classroom with ready-to-share code
      if (role === 'teacher') {
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const teacherClassroom: Classroom = {
          id: `cls_${newProfile.id}`,
          name: `ห้องเรียน ${newProfile.name} (${newProfile.subject || 'กลุ่มสาระการเรียนรู้'})`,
          subject: newProfile.subject || 'วิทยาศาสตร์และเทคโนโลยี',
          code: classCode,
          teacherId: newProfile.id,
          teacherName: newProfile.name,
          description: `ห้องเรียนออนไลน์วิชา${newProfile.subject || 'ทั่วไป'} โรงเรียนไทยนิยมสงเคราะห์`,
          color: 'from-blue-600 to-indigo-700',
          studentIds: [],
          schedule: 'ตามตารางสอน',
          createdAt: new Date().toISOString(),
        };
        try {
          await createClassroom(teacherClassroom);
        } catch (clsErr) {
          console.warn('Teacher starter classroom notice:', clsErr);
        }
      } else if (role === 'student') {
        try {
          await enrollStudentInDefaultClassrooms(newProfile.id);
        } catch (enrErr) {
          console.warn('Student default enrollment notice:', enrErr);
        }
      }

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
    const demo = role === 'admin' ? DEMO_ADMIN : role === 'teacher' ? DEMO_TEACHER : DEMO_STUDENT;
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

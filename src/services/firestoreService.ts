import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  Classroom,
  Lesson,
  Assignment,
  Submission,
  AttendanceRecord,
  BehaviorRecord,
  Quiz,
  QuizResult,
  ChatMessage,
  Certificate,
  UserProfile,
  RubricScoreItem,
  AttachedFile,
} from '../types';

/**
 * Recursively strips undefined values from an object or array so Firestore setDoc / updateDoc never fails.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as any;
  }
  return data;
}

// ================= USER PROFILE =================
export async function saveUserProfile(user: UserProfile): Promise<void> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const normalizedUser: UserProfile = {
    ...user,
    email: cleanEmail,
  };

  const sanitized = sanitizeForFirestore({
    ...normalizedUser,
    updatedAt: new Date().toISOString(),
  });

  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), sanitized, { merge: true });
  } catch (error) {
    console.warn('saveUserProfile Firestore notice:', error);
  }

  // Also cache locally for instant offline/fallback access
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u): u is UserProfile => Boolean(u && u.id)) : [];
    const idx = localList.findIndex((u) => u && (u.id === user.id || (u.email && u.email.toLowerCase() === cleanEmail)));
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...normalizedUser };
    } else {
      localList.push(normalizedUser);
    }
    localStorage.setItem('eduvibe_registered_users', JSON.stringify(localList));

    // Also update current active user if matching
    const curRaw = localStorage.getItem('eduvibe_current_user');
    if (curRaw) {
      const cur = JSON.parse(curRaw);
      if (cur && (cur.id === user.id || cur.email?.toLowerCase() === cleanEmail)) {
        localStorage.setItem('eduvibe_current_user', JSON.stringify({ ...cur, ...normalizedUser }));
      }
    }
  } catch {
    // ignore
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) } as UserProfile;
    }
  } catch (error) {
    console.warn('getUserProfile Firestore notice:', error);
  }

  // Check local cached users
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u): u is UserProfile => Boolean(u && u.id)) : [];
    const found = localList.find((u) => u && u.id === userId);
    if (found) return found;
  } catch {
    // ignore
  }

  return null;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  return getUserByEmailOrStudentId(email);
}

export async function getUserByEmailOrStudentId(identifier: string): Promise<UserProfile | null> {
  const clean = identifier.trim();
  const cleanLower = clean.toLowerCase();

  // 1. Direct doc ID match
  try {
    const docRef = doc(db, 'users', clean);
    const snapDoc = await getDoc(docRef);
    if (snapDoc.exists()) {
      return { id: snapDoc.id, ...(snapDoc.data() as any) } as UserProfile;
    }
  } catch {
    // ignore
  }

  // 2. Query by email in Firestore
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanLower));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...(docSnap.data() as any) } as UserProfile;
    }
  } catch (error) {
    console.warn('getUserByEmailOrStudentId email query notice:', error);
  }

  // 3. Query by studentId in Firestore
  try {
    const qStd = query(collection(db, 'users'), where('studentId', '==', clean));
    const snapStd = await getDocs(qStd);
    if (!snapStd.empty) {
      const docSnap = snapStd.docs[0];
      return { id: docSnap.id, ...(docSnap.data() as any) } as UserProfile;
    }
  } catch {
    // ignore
  }

  // 4. Scan all documents in users collection (case-insensitive fallback)
  try {
    const snapAll = await getDocs(collection(db, 'users'));
    for (const d of snapAll.docs) {
      const data = { id: d.id, ...(d.data() as any) } as UserProfile;
      const userEmail = (data.email || '').toLowerCase();
      const userUsername = userEmail.includes('@') ? userEmail.split('@')[0] : '';
      if (
        userEmail === cleanLower ||
        (userUsername && userUsername === cleanLower) ||
        data.studentId === clean ||
        data.studentId?.toLowerCase() === cleanLower ||
        data.id === clean
      ) {
        return data;
      }
    }
  } catch {
    // ignore
  }

  // 5. Check local cache
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u): u is UserProfile => Boolean(u && u.id)) : [];
    const found = localList.find(
      (u) => {
        if (!u) return false;
        const uEmail = (u.email || '').toLowerCase();
        const uUsername = uEmail.includes('@') ? uEmail.split('@')[0] : '';
        return (
          uEmail === cleanLower ||
          (uUsername && uUsername === cleanLower) ||
          u.studentId === clean ||
          u.studentId?.toLowerCase() === cleanLower ||
          u.id === clean
        );
      }
    );
    if (found) return found;
  } catch {
    // ignore
  }

  return null;
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const path = 'users';
  try {
    const q = query(collection(db, path));
    return onSnapshot(
      q,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          users.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(users);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.warn('deleteUserProfile notice:', error);
  }
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u) => u && u.id !== userId) : [];
    localStorage.setItem('eduvibe_registered_users', JSON.stringify(localList));
  } catch {
    // ignore
  }
}

// ================= CLASSROOMS =================
export function subscribeClassrooms(
  arg1: string | ((classrooms: Classroom[]) => void),
  arg2?: 'teacher' | 'student' | ((classrooms: Classroom[]) => void),
  arg3?: (classrooms: Classroom[]) => void
) {
  const path = 'classrooms';
  let callback: (classrooms: Classroom[]) => void;
  let q: any;

  if (typeof arg1 === 'function') {
    callback = arg1;
    q = query(collection(db, path));
  } else if (typeof arg2 === 'function') {
    callback = arg2;
    q = query(collection(db, path));
  } else {
    callback = arg3 || (() => {});
    const userId = arg1;
    const role = arg2;
    q =
      role === 'teacher'
        ? query(collection(db, path), where('teacherId', '==', userId))
        : query(collection(db, path), where('studentIds', 'array-contains', userId));
  }

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Classroom[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list);
      },
      (error) => {
        console.warn('subscribeClassrooms error:', error);
      }
    );
  } catch (error) {
    console.warn('subscribeClassrooms catch notice:', error);
    return () => {};
  }
}

export async function createClassroom(classroom: Classroom): Promise<void> {
  const path = `classrooms/${classroom.id}`;
  try {
    const sanitized = sanitizeForFirestore(classroom);
    await setDoc(doc(db, 'classrooms', classroom.id), sanitized);
  } catch (error) {
    console.error('Error creating classroom:', error);
    throw error;
  }
}

export async function updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<void> {
  const path = `classrooms/${classroomId}`;
  try {
    const sanitized = sanitizeForFirestore(updates);
    await updateDoc(doc(db, 'classrooms', classroomId), sanitized);
  } catch (error) {
    console.error('Error updating classroom:', error);
    throw error;
  }
}

export async function deleteClassroom(classroomId: string): Promise<void> {
  const path = `classrooms/${classroomId}`;
  try {
    // 1. Delete classroom document itself
    await deleteDoc(doc(db, 'classrooms', classroomId));

    // 2. Cascade delete related classroom child records to keep database clean and stable
    const cascadeCollections = [
      'assignments',
      'submissions',
      'attendance',
      'behavior',
      'quizzes',
      'quiz_results',
      'lessons',
      'messages',
    ];

    for (const colName of cascadeCollections) {
      try {
        const q = query(collection(db, colName), where('classroomId', '==', classroomId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } catch (childErr) {
        console.warn(`Notice during cleanup of ${colName} for classroom ${classroomId}:`, childErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<void> {
  const path = `classrooms/${classroomId}`;
  try {
    const docRef = doc(db, 'classrooms', classroomId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as Classroom;
    const currentStudents = (data.studentIds || []).filter((id) => id !== studentId);
    await updateDoc(docRef, { studentIds: currentStudents });
  } catch (error) {
    console.warn('removeStudentFromClassroom notice:', error);
  }
}

export async function addStudentToClassroom(classroomId: string, studentId: string): Promise<void> {
  const path = `classrooms/${classroomId}`;
  try {
    const docRef = doc(db, 'classrooms', classroomId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as Classroom;
    const currentStudents = data.studentIds || [];
    if (!currentStudents.includes(studentId)) {
      await updateDoc(docRef, { studentIds: [...currentStudents, studentId] });
    }
  } catch (error) {
    console.warn('addStudentToClassroom notice:', error);
  }
}

export async function enrollStudentInDefaultClassrooms(studentId: string): Promise<void> {
  // Empty intentionally: new students must not be auto-enrolled in classrooms
}

export async function getClassroomStudents(studentIds: string[]): Promise<UserProfile[]> {
  const result: UserProfile[] = [];
  const foundMap = new Set<string>();

  if (!studentIds || studentIds.length === 0) {
    return [];
  }

  // 1. Fetch from Firestore users collection for real registered accounts
  for (const id of studentIds) {
    if (!id || id === 'undefined') continue;
    try {
      let profile = await getUserProfile(id);
      if (!profile) {
        profile = await getUserByEmailOrStudentId(id);
      }
      if (profile && profile.id && profile.name && !foundMap.has(profile.id)) {
        result.push(profile);
        foundMap.add(profile.id);
      }
    } catch {
      // ignore
    }
  }

  // 2. Check local registered cache for real registered users if not found in Firestore
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u): u is UserProfile => Boolean(u && u.id)) : [];
    for (const id of studentIds) {
      if (!id || foundMap.has(id)) continue;
      const found = localList.find((u) => u && (u.id === id || u.studentId === id));
      if (found && found.id && found.name && !foundMap.has(found.id)) {
        result.push(found);
        foundMap.add(found.id);
      }
    }
  } catch {
    // ignore
  }

  // Strictly return only real, verified registered students (do not generate fake/synthetic dummy profiles)
  return result;
}

export async function getAllRegisteredStudents(): Promise<UserProfile[]> {
  const result: UserProfile[] = [];
  const map = new Map<string, UserProfile>();

  // 1. Local storage registered users
  try {
    const rawList = JSON.parse(localStorage.getItem('eduvibe_registered_users') || '[]');
    const localList: UserProfile[] = Array.isArray(rawList) ? rawList.filter((u): u is UserProfile => Boolean(u && u.id)) : [];
    localList.forEach((u) => {
      if (u && u.role === 'student' && u.id) map.set(u.id, u);
    });
  } catch {
    // ignore
  }

  // 2. Firestore users collection
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as any) } as UserProfile;
      if (data && data.id) {
        map.set(data.id, data);
      }
    });
  } catch {
    // ignore
  }

  map.forEach((student) => result.push(student));
  return result;
}

export async function clearAllSystemData(): Promise<void> {
  const collections = [
    'classrooms',
    'assignments',
    'submissions',
    'attendance',
    'behavior_records',
    'quizzes',
    'quiz_results',
    'lessons',
    'messages',
    'certificates',
    'users'
  ];

  try {
    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName));
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.error('Error clearing Firestore collections:', err);
  }

  // Clear local storage cache
  try {
    localStorage.removeItem('eduvibe_registered_users');
    localStorage.removeItem('eduvibe_local_submissions');
    localStorage.removeItem('eduvibe_local_classrooms');
    sessionStorage.removeItem('eduvibe_pending_reg');
  } catch {
    // ignore
  }
}

export async function joinClassroomByCode(code: string, studentId: string): Promise<Classroom | null> {
  const path = 'classrooms';
  try {
    const q = query(collection(db, path), where('code', '==', code.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const classDoc = snap.docs[0];
    const data = classDoc.data() as Classroom;
    const currentStudents = data.studentIds || [];
    if (!currentStudents.includes(studentId)) {
      await updateDoc(doc(db, 'classrooms', classDoc.id), {
        studentIds: [...currentStudents, studentId],
      });
    }
    return { id: classDoc.id, ...data };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

// ================= LESSONS =================
export function subscribeLessons(classroomId: string, callback: (lessons: Lesson[]) => void) {
  const path = 'lessons';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Lesson[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      },
      (error) => {
        console.warn('subscribeLessons Firestore notice:', error);
      }
    );
  } catch (error) {
    console.warn('subscribeLessons catch notice:', error);
    return () => {};
  }
}

export async function saveLesson(lesson: Lesson): Promise<void> {
  const path = `lessons/${lesson.id}`;
  try {
    const safeLesson = { ...lesson };
    if (safeLesson.mediaUrl && safeLesson.mediaUrl.startsWith('data:') && safeLesson.mediaUrl.length > 150000) {
      delete safeLesson.mediaUrl;
    }
    if (safeLesson.files && Array.isArray(safeLesson.files)) {
      safeLesson.files = safeLesson.files.map((f) => {
        const next = { ...f };
        if (next.data && next.data.length > 150000) {
          delete next.data;
        }
        if (next.url && next.url.startsWith('data:') && next.url.length > 150000) {
          delete next.url;
        }
        return next;
      });
    }

    const sanitized = sanitizeForFirestore(safeLesson);
    await setDoc(doc(db, 'lessons', lesson.id), sanitized);
  } catch (error) {
    console.error('Error saving lesson:', error);
    throw error;
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const path = `lessons/${lessonId}`;
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
}

// ================= ASSIGNMENTS =================
export function subscribeAssignments(classroomId: string, callback: (assignments: Assignment[]) => void) {
  const path = 'assignments';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Assignment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      },
      (error) => {
        console.warn('subscribeAssignments Firestore notice:', error);
      }
    );
  } catch (error) {
    console.warn('subscribeAssignments catch notice:', error);
    return () => {};
  }
}

export async function saveAssignment(assignment: Assignment): Promise<void> {
  const path = `assignments/${assignment.id}`;
  try {
    const safeAssignment = { ...assignment };
    if (safeAssignment.fileUrl && safeAssignment.fileUrl.startsWith('data:') && safeAssignment.fileUrl.length > 150000) {
      delete safeAssignment.fileUrl;
    }
    if (safeAssignment.files && Array.isArray(safeAssignment.files)) {
      safeAssignment.files = safeAssignment.files.map((f) => {
        const next = { ...f };
        if (next.data && next.data.length > 150000) {
          delete next.data;
        }
        if (next.url && next.url.startsWith('data:') && next.url.length > 150000) {
          delete next.url;
        }
        return next;
      });
    }

    const sanitized = sanitizeForFirestore(safeAssignment);
    await setDoc(doc(db, 'assignments', assignment.id), sanitized);
  } catch (error) {
    console.error('Error saving assignment:', error);
    throw error;
  }
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    // 1. Delete assignment document itself
    await deleteDoc(doc(db, 'assignments', assignmentId));

    // 2. Cascade delete submissions associated with this assignment
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const snap = await getDocs(q);
      const batchDeletes = snap.docs.map((d) => deleteDoc(doc(db, 'submissions', d.id)));
      await Promise.all(batchDeletes);
    } catch (subErr) {
      console.warn('Notice cleaning up submissions for deleted assignment:', subErr);
    }
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
}

// ================= SUBMISSIONS =================
export function subscribeSubmissions(classroomId: string, callback: (subs: Submission[]) => void) {
  const path = 'submissions';

  const mergeWithLocal = (firestoreList: Submission[]): Submission[] => {
    try {
      const raw = JSON.parse(localStorage.getItem('eduvibe_local_submissions') || '[]');
      const localList: Submission[] = Array.isArray(raw) ? raw.filter((s) => s && s.classroomId === classroomId) : [];
      const map = new Map<string, Submission>();
      firestoreList.forEach((s) => map.set(s.id, s));
      localList.forEach((s) => {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        } else {
          const existing = map.get(s.id)!;
          map.set(s.id, {
            ...existing,
            fileUrl: existing.fileUrl || s.fileUrl,
            fileData: existing.fileData || s.fileData,
            fileName: existing.fileName || s.fileName,
            files: (existing.files && existing.files.length > 0) ? existing.files : s.files,
          });
        }
      });
      return Array.from(map.values()).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    } catch {
      return firestoreList.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    }
  };

  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(mergeWithLocal(list));
      },
      (error) => {
        console.warn('subscribeSubmissions Firestore notice:', error);
        callback(mergeWithLocal([]));
      }
    );
  } catch (error) {
    console.warn('subscribeSubmissions catch notice:', error);
    callback(mergeWithLocal([]));
    return () => {};
  }
}

export async function submitHomework(submission: Submission): Promise<void> {
  const path = `submissions/${submission.id}`;

  // Cache in localStorage safely without crashing on quota limit
  try {
    const raw = JSON.parse(localStorage.getItem('eduvibe_local_submissions') || '[]');
    const list: Submission[] = Array.isArray(raw) ? raw : [];
    const idx = list.findIndex((s) => s && s.id === submission.id);
    if (idx >= 0) {
      list[idx] = submission;
    } else {
      list.push(submission);
    }
    localStorage.setItem('eduvibe_local_submissions', JSON.stringify(list));
  } catch {
    // If local storage is full, try caching without large base64 fileData
    try {
      const raw = JSON.parse(localStorage.getItem('eduvibe_local_submissions') || '[]');
      const list: Submission[] = Array.isArray(raw) ? raw : [];
      const compactSub = { ...submission };
      if (compactSub.fileData && compactSub.fileData.length > 100000) {
        delete compactSub.fileData;
      }
      if (compactSub.files) {
        compactSub.files = compactSub.files.map(f => {
          if (f.data && f.data.length > 100000) {
            const { data, ...rest } = f;
            return rest;
          }
          return f;
        });
      }
      const idx = list.findIndex((s) => s && s.id === compactSub.id);
      if (idx >= 0) {
        list[idx] = compactSub;
      } else {
        list.push(compactSub);
      }
      localStorage.setItem('eduvibe_local_submissions', JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  try {
    const safeSubmission = { ...submission };
    // If base64 payload is larger than 150KB, strip it from Firestore document to stay well under 1MB limit
    if (safeSubmission.fileData && safeSubmission.fileData.length > 150000) {
      delete safeSubmission.fileData;
    }
    if (safeSubmission.fileUrl && safeSubmission.fileUrl.startsWith('data:') && safeSubmission.fileUrl.length > 150000) {
      delete safeSubmission.fileUrl;
    }
    if (safeSubmission.files && Array.isArray(safeSubmission.files)) {
      safeSubmission.files = safeSubmission.files.map(f => {
        const next = { ...f };
        if (next.data && next.data.length > 150000) {
          delete next.data;
        }
        if (next.url && next.url.startsWith('data:') && next.url.length > 150000) {
          delete next.url;
        }
        return next;
      });
    }

    const sanitized = sanitizeForFirestore(safeSubmission);
    await setDoc(doc(db, 'submissions', submission.id), sanitized);
  } catch (error) {
    console.warn('submitHomework Firestore notice:', error);
  }
}

export async function gradeSubmission(
  submissionId: string,
  updates: {
    score: number;
    teacherFeedback: string;
    aiFeedback?: string;
    rubricScores?: RubricScoreItem[];
    pointsAwarded: number;
    status: 'graded';
    studentId: string;
  }
): Promise<void> {
  const path = `submissions/${submissionId}`;
  try {
    await updateDoc(doc(db, 'submissions', submissionId), {
      score: updates.score,
      teacherFeedback: updates.teacherFeedback,
      ...(updates.aiFeedback ? { aiFeedback: updates.aiFeedback } : {}),
      ...(updates.rubricScores ? { rubricScores: updates.rubricScores } : {}),
      pointsAwarded: updates.pointsAwarded,
      status: 'graded',
    });

    // Award points to student user profile
    const userDoc = await getDoc(doc(db, 'users', updates.studentId));
    if (userDoc.exists()) {
      const currentPts = userDoc.data().totalPoints || 0;
      const newPts = currentPts + updates.pointsAwarded;
      const newLvl = Math.floor(newPts / 200) + 1;
      await updateDoc(doc(db, 'users', updates.studentId), {
        totalPoints: newPts,
        level: newLvl,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= ATTENDANCE =================
export function subscribeAttendance(classroomId: string, callback: (records: AttendanceRecord[]) => void) {
  const path = 'attendance';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const path = `attendance/${record.id}`;
  try {
    const sanitized = sanitizeForFirestore(record);
    await setDoc(doc(db, 'attendance', record.id), sanitized);
  } catch (error) {
    console.error('Error saving attendance:', error);
    throw error;
  }
}

// ================= BEHAVIOR =================
export function subscribeBehavior(classroomId: string, callback: (behaviors: BehaviorRecord[]) => void) {
  const path = 'behavior';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: BehaviorRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '')));
      },
      (error) => {
        console.warn('subscribeBehavior Firestore notice:', error);
      }
    );
  } catch (error) {
    console.warn('subscribeBehavior catch notice:', error);
    return () => {};
  }
}

export async function addBehaviorRecord(record: BehaviorRecord): Promise<void> {
  const path = `behavior/${record.id}`;
  try {
    const sanitized = sanitizeForFirestore(record);
    await setDoc(doc(db, 'behavior', record.id), sanitized);

    // Adjust student points in user profile
    try {
      const userDoc = await getDoc(doc(db, 'users', record.studentId));
      if (userDoc.exists()) {
        const currentPts = userDoc.data().totalPoints || 0;
        const newPts = Math.max(0, currentPts + record.scoreDelta);
        const newLvl = Math.floor(newPts / 200) + 1;
        await updateDoc(doc(db, 'users', record.studentId), {
          totalPoints: newPts,
          level: newLvl,
        });
      }
    } catch (ptsErr) {
      console.warn('Notice updating student points from behavior:', ptsErr);
    }
  } catch (error) {
    console.error('Error adding behavior record:', error);
    throw error;
  }
}

export async function deleteBehaviorRecord(recordId: string): Promise<void> {
  const path = `behavior/${recordId}`;
  try {
    await deleteDoc(doc(db, 'behavior', recordId));
  } catch (error) {
    console.error('Error deleting behavior record:', error);
    throw error;
  }
}

// ================= QUIZZES =================
export function subscribeQuizzes(classroomId: string, callback: (quizzes: Quiz[]) => void) {
  const path = 'quizzes';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Quiz[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const path = `quizzes/${quiz.id}`;
  try {
    await setDoc(doc(db, 'quizzes', quiz.id), quiz);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeQuizResults(studentId: string, callback: (results: QuizResult[]) => void) {
  const path = 'quiz_results';
  try {
    const q = query(collection(db, path), where('studentId', '==', studentId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: QuizResult[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function submitQuizResult(result: QuizResult): Promise<void> {
  const path = `quiz_results/${result.id}`;
  try {
    await setDoc(doc(db, 'quiz_results', result.id), result);

    if (result.pointsEarned > 0) {
      const userDoc = await getDoc(doc(db, 'users', result.studentId));
      if (userDoc.exists()) {
        const currentPts = userDoc.data().totalPoints || 0;
        const newPts = currentPts + result.pointsEarned;
        const newLvl = Math.floor(newPts / 200) + 1;
        await updateDoc(doc(db, 'users', result.studentId), {
          totalPoints: newPts,
          level: newLvl,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= CHAT =================
export function subscribeMessages(classroomId: string, callback: (msgs: ChatMessage[]) => void) {
  const path = 'messages';
  try {
    const q = query(collection(db, path), where('classroomId', '==', classroomId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '')));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function sendChatMessage(msg: ChatMessage): Promise<void> {
  const path = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), msg);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= CERTIFICATES =================
export function subscribeCertificates(studentId: string, callback: (certs: Certificate[]) => void) {
  const path = 'certificates';
  try {
    const q = query(collection(db, path), where('studentId', '==', studentId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Certificate[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list.sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || '')));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function issueCertificate(cert: Certificate): Promise<void> {
  const path = `certificates/${cert.id}`;
  try {
    await setDoc(doc(db, 'certificates', cert.id), cert);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Aliases for convenient importing
export {
  subscribeClassrooms as subscribeToClassrooms,
  subscribeAssignments as subscribeToAssignments,
  subscribeSubmissions as subscribeToSubmissions,
  subscribeAttendance as subscribeToAttendance,
  subscribeBehavior as subscribeToBehaviors,
  subscribeQuizzes as subscribeToQuizzes,
  subscribeLessons as subscribeToLessons,
  subscribeMessages as subscribeToMessages,
  subscribeCertificates as subscribeToCertificates,
};

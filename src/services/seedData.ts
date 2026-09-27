import {
  createClassroom,
  saveLesson,
  saveAssignment,
  submitHomework,
  saveAttendance,
  addBehaviorRecord,
  saveQuiz,
  sendChatMessage,
  issueCertificate,
  saveUserProfile,
} from './firestoreService';
import type { Classroom, UserProfile } from '../types';
import { DEMO_STUDENTS } from '../data/defaultStudents';

export { DEMO_STUDENTS };

export const DEMO_CLASSROOMS: Classroom[] = [
  {
    id: 'cls_demo_sci301',
    name: 'วิทยาศาสตร์และนวัตกรรม ม.3/1',
    subject: 'วิทยาศาสตร์และเทคโนโลยี ว23101',
    code: 'SCI301',
    teacherId: 'teacher_demo_1',
    teacherName: 'ครูสมชาย ใจดี',
    description: 'ห้องเรียนแห่งการสำรวจนวัตกรรม ดาราศาสตร์ เทคโนโลยีชีวภาพ โรงเรียนไทยนิยมสงเคราะห์',
    color: 'from-emerald-500 to-teal-700',
    studentIds: ['teacher_demo_1', ...DEMO_STUDENTS.map((s) => s.id)],
    schedule: 'จันทร์ 08:30 - 10:10 น. / พฤหัสบดี 13:00 - 14:40 น.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cls_demo_stem302',
    name: 'STEM นวัตกรรมหุ่นยนต์และ AI',
    subject: 'การออกแบบและเทคโนโลยี ว23102',
    code: 'STM302',
    teacherId: 'teacher_demo_1',
    teacherName: 'ครูสมชาย ใจดี',
    description: 'ฝึกกระบวนการคิดเชิงคำนวณและประดิษฐ์นวัตกรรม AI แก้ปัญหาโรงเรียนไทยนิยมสงเคราะห์และชุมชน',
    color: 'from-blue-600 to-indigo-700',
    studentIds: ['teacher_demo_1', ...DEMO_STUDENTS.map((s) => s.id)],
    schedule: 'อังคาร 13:00 - 14:40 น.',
    createdAt: new Date().toISOString(),
  },
];

export async function seedInitialData(): Promise<void> {
  const teacherUser: UserProfile = {
    id: 'teacher_demo_1',
    email: 'somchai.teacher@thainiyom.ac.th',
    name: 'ครูสมชาย ใจดี',
    role: 'teacher',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    totalPoints: 0,
    level: 1,
    createdAt: new Date().toISOString(),
  };

  try {
    // Check if initial classroom already seeded
    await seedSampleClassroom(teacherUser);
  } catch (err) {
    console.error('Seed error:', err);
  }
}

export async function seedSampleClassroom(teacherUser: UserProfile): Promise<Classroom> {
  const classroomId = 'cls_demo_sci301';
  const classroom: Classroom = {
    id: classroomId,
    name: 'วิทยาศาสตร์และนวัตกรรม ม.3/1',
    subject: 'วิทยาศาสตร์และเทคโนโลยี ว23101',
    code: 'SCI301',
    teacherId: teacherUser.id,
    teacherName: teacherUser.name,
    description: 'ห้องเรียนแห่งการสำรวจนวัตกรรม ดาราศาสตร์ เทคโนโลยีชีวภาพ และการออกแบบเชิงวิศวกรรม',
    color: 'from-emerald-500 to-teal-700',
    studentIds: [teacherUser.id, ...DEMO_STUDENTS.map((s) => s.id)],
    schedule: 'จันทร์ 08:30 - 10:10 น. / พฤหัสบดี 13:00 - 14:40 น.',
    createdAt: new Date().toISOString(),
  };

  // 1. Save Classroom
  await createClassroom(classroom);

  // 2. Save sample student profiles
  for (const std of DEMO_STUDENTS) {
    await saveUserProfile(std);
  }

  // 3. Save sample Lessons
  await saveLesson({
    id: `les_${Date.now()}_1`,
    classroomId,
    title: 'บทที่ 1: การตัดแต่งยีนและนวัตกรรมพันธุวิศวกรรม (CRISPR)',
    content:
      'พันธุวิศวกรรม (Genetic Engineering) คือกระบวนการดัดแปลงสารพันธุกรรมของสิ่งมีชีวิต เพื่อให้ได้ลักษณะที่ต้องการ เช่น พืชทนแล้ง สัตว์ที่ต้านทานโรค และการรักษาโรคทางพันธุกรรมในมนุษย์ เทคโนโลยี CRISPR-Cas9 ช่วยให้สามารถตัดต่อลำดับเบสจำเพาะได้อย่างแม่นยำและรวดเร็ว',
    mediaUrl: 'https://www.youtube.com/watch?v=4YKFw820MVo',
    mediaType: 'video',
    unit: 'หน่วยการเรียนรู้ที่ 1: เทคโนโลยีชีวภาพ',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  });

  await saveLesson({
    id: `les_${Date.now()}_2`,
    classroomId,
    title: 'บทที่ 2: เอกสารประกอบการสอน สรุปกฎทางพันธุศาสตร์ของเมนเดล',
    content:
      'สรุปอัตราส่วนพันธุศาสตร์ 3:1 และ 9:3:3:1 พร้อมตาราง Punnett Square และตัวอย่างการคำนวณความน่าจะเป็นของจีโนไทป์และฟีโนไทป์ในรุ่นลูก',
    mediaUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'slide',
    unit: 'หน่วยการเรียนรู้ที่ 1: เทคโนโลยีชีวภาพ',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  });

  // 4. Save sample Assignment
  const assignmentId = `asg_${Date.now()}_1`;
  await saveAssignment({
    id: assignmentId,
    classroomId,
    title: 'การบ้าน: วิเคราะห์ประโยชน์และผลกระทบทางจริยธรรมของ CRISPR',
    description:
      'ให้นักเรียนเขียนสรุปกรณีศึกษาการนำเทคโนโลยี CRISPR ไปใช้ในทางการแพทย์หรือเกษตรกรรม ความยาว 1-2 ย่อหน้า พร้อมแสดงความคิดเห็นในประเด็นจริยธรรมวิทยาศาสตร์',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    maxScore: 10,
    pointsReward: 50,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  });

  // 5. Save sample Submissions (one already submitted waiting for grading, one graded)
  await submitHomework({
    id: `sub_${Date.now()}_1`,
    assignmentId,
    classroomId,
    studentId: DEMO_STUDENTS[0].id,
    studentName: DEMO_STUDENTS[0].name,
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    content:
      'เทคโนโลยี CRISPR-Cas9 มีประโยชน์มหาศาลในการรักษาโรคธาลัสซีเมียและมะเร็งเม็ดเลือดขาว โดยการแก้ไขยีนที่ผิดปกติในเซลล์ต้นกำเนิด อย่างไรก็ตาม ในแง่จริยธรรม การตัดแต่งยีนในตัวอ่อนมนุษย์ (Designer Babies) อาจนำไปสู่ความเหลื่อมล้ำทางสังคมและการเลือกปฏิบัติทางชีวภาพ จึงจำเป็นต้องมีกฎหมายควบคุมและแนวปฏิบัติสากลอย่างเข้มงวด',
    status: 'submitted',
    score: null,
    teacherFeedback: '',
    aiFeedback: '',
    pointsAwarded: 0,
  });

  await submitHomework({
    id: `sub_${Date.now()}_2`,
    assignmentId,
    classroomId,
    studentId: DEMO_STUDENTS[1].id,
    studentName: DEMO_STUDENTS[1].name,
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    content:
      'CRISPR ช่วยทำให้พืชทนต่อแมลงและสภาวะแห้งแล้ง ช่วยลดการใช้ยาฆ่าแมลง แต่ก็มีความเสี่ยงที่พืชดัดแปลงอาจกลืนพันธุ์พืชพื้นเมือง',
    status: 'graded',
    score: 8.5,
    teacherFeedback: 'เนื้อหาดี ชี้ประเด็นชัดเจน หากยกตัวอย่างพืชที่กำลังทดลองจริงจะสมบูรณ์ยิ่งขึ้นครับ',
    aiFeedback: 'จุดแข็ง: มองเห็นผลกระทบสิ่งแวดล้อมได้ชัดเจน | จุดพัฒนา: เพิ่มตัวอย่างเชิงประจักษ์',
    pointsAwarded: 50,
  });

  // 6. Save sample Attendance for today
  const todayStr = new Date().toISOString().split('T')[0];
  await saveAttendance({
    id: `att_${classroomId}_${todayStr}`,
    classroomId,
    date: todayStr,
    checkedAt: new Date().toISOString(),
    records: {
      [DEMO_STUDENTS[0].id]: { status: 'present' },
      [DEMO_STUDENTS[1].id]: { status: 'present' },
      [DEMO_STUDENTS[2].id]: { status: 'present' },
      [DEMO_STUDENTS[3].id]: { status: 'late', note: 'รถติดช่วงเช้า' },
    },
  });

  // 7. Save sample Behaviors
  await addBehaviorRecord({
    id: `beh_${Date.now()}_1`,
    classroomId,
    studentId: DEMO_STUDENTS[0].id,
    studentName: DEMO_STUDENTS[0].name,
    type: 'positive',
    category: 'จิตอาสาและความรับผิดชอบ',
    scoreDelta: 15,
    note: 'ช่วยเพื่อนจัดเตรียมอุปกรณ์การทดลองทางวิทยาศาสตร์และทำความสะอาดโต๊ะแล็บ',
    date: todayStr,
  });

  await addBehaviorRecord({
    id: `beh_${Date.now()}_2`,
    classroomId,
    studentId: DEMO_STUDENTS[2].id,
    studentName: DEMO_STUDENTS[2].name,
    type: 'positive',
    category: 'การมีส่วนร่วมในชั้นเรียน',
    scoreDelta: 20,
    note: 'ตั้งคำถามเชื่อมโยงกับบทเรียนเรื่องการแพทย์แม่นยำได้น่าประทับใจ',
    date: todayStr,
  });

  // 8. Save sample Quiz
  await saveQuiz({
    id: `quiz_${Date.now()}_1`,
    classroomId,
    title: 'แบบทดสอบย่อย: ความรู้พื้นฐานพันธุศาสตร์และ CRISPR',
    topic: 'พันธุศาสตร์และเทคโนโลยีชีวภาพ',
    timeLimitMinutes: 10,
    maxScore: 10,
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        question: 'เอนไซม์ชนิดใดทำหน้าที่เสมือนกรรไกรระดับโมเลกุลในระบบ CRISPR-Cas9?',
        options: ['DNA Polymerase', 'Cas9 Nuclease', 'RNA Ligase', 'Amylase'],
        answerIndex: 1,
        explanation: 'Cas9 เป็นเอนไซม์ประเภท endonuclease ที่ทำหน้าที่ตัดสายคู่ของ DNA ณ ตำแหน่งเป้าหมายจำเพาะ',
      },
      {
        id: 'q2',
        question: 'ใครได้รับการยกย่องให้เป็น "บิดาแห่งพันธุศาสตร์"?',
        options: ['ชาร์ลส์ ดาร์วิน', 'เกรเกอร์ เมนเดล', 'เจมส์ วัตสัน', 'หลุยส์ ปาสเตอร์'],
        answerIndex: 1,
        explanation: 'เกรเกอร์ เมนเดล ศึกษาการถ่ายทอดลักษณะทางพันธุกรรมผ่านต้นถั่วลันเตาจนค้นพบกฎทางพันธุศาสตร์',
      },
      {
        id: 'q3',
        question: 'ข้อใดคือโมเลกุลที่นำทาง Cas9 ไปยังตำแหน่งของยีนเป้าหมาย?',
        options: ['Guide RNA (gRNA)', 'Ribosome', 'tRNA', 'Lipid'],
        answerIndex: 0,
        explanation: 'Guide RNA ถูกออกแบบให้จับคู่เบสกับลำดับ DNA เป้าหมาย เพื่อชี้นำ Cas9 ให้ตัดได้อย่างแม่นยำ',
      },
    ],
  });

  // 9. Save sample Chat Message
  await sendChatMessage({
    id: `msg_${Date.now()}_1`,
    senderId: DEMO_STUDENTS[0].id,
    senderName: DEMO_STUDENTS[0].name,
    senderRole: 'student',
    receiverId: teacherUser.id,
    classroomId,
    text: 'สวัสดีค่ะอาจารย์ การบ้าน CRISPR หนูส่งทางระบบแล้วนะคะ มีตรงประเด็นจริยธรรมที่หนูอยากปรึกษาเพิ่มเติมนิดหน่อยค่ะ',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  });

  await sendChatMessage({
    id: `msg_${Date.now()}_2`,
    senderId: teacherUser.id,
    senderName: teacherUser.name,
    senderRole: 'teacher',
    receiverId: DEMO_STUDENTS[0].id,
    classroomId,
    text: 'ยอดเยี่ยมมากครับสมหญิง ครูอ่านแล้วเขียนได้ดีมาก เดี๋ยวช่วงท้ายคาบวันพฤหัสบดีเรามาอภิปรายกันนะ',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  });

  // 10. Sample Certificate for top student
  await issueCertificate({
    id: `cert_${Date.now()}_1`,
    studentId: DEMO_STUDENTS[2].id,
    studentName: DEMO_STUDENTS[2].name,
    studentCode: DEMO_STUDENTS[2].studentId,
    title: 'เกียรติบัตรยอดนักวิทย์รุ่นเยาว์ (Young Scientist Award)',
    reason: 'เป็นผู้มีความวิริยะอุตสาหะ ส่งงานตรงเวลาครบถ้วน และทำคะแนนสอบยอดเยี่ยมระดับเหรียญทอง',
    issuedDate: todayStr,
    teacherName: teacherUser.name,
    schoolName: 'โรงเรียนไทยนิยมสงเคราะห์',
    certificateNumber: `TNS-${new Date().getFullYear()}-0089`,
    pointsSnapshot: DEMO_STUDENTS[2].totalPoints,
  });

  return classroom;
}

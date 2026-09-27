import React, { useState } from 'react';
import type { Classroom, BehaviorRecord, UserProfile } from '../../types';
import { addBehaviorRecord, deleteBehaviorRecord } from '../../services/firestoreService';
import {
  HeartHandshake,
  PlusCircle,
  ThumbsUp,
  AlertTriangle,
  Award,
  Clock,
  Sparkles,
  Filter,
  Users,
  FileSpreadsheet,
  Download,
  Copy,
  ExternalLink,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';

interface BehaviorManagerProps {
  classroom: Classroom | null;
  behaviors: BehaviorRecord[];
  students?: UserProfile[];
}

export const BehaviorManager: React.FC<BehaviorManagerProps> = ({
  classroom,
  behaviors,
  students,
}) => {
  const studentList = (students || []).filter((s): s is UserProfile => Boolean(s && s.id));
  const [selectedStudentId, setSelectedStudentId] = useState(studentList[0]?.id || '');
  const [type, setType] = useState<'positive' | 'needs_improvement'>('positive');
  const [category, setCategory] = useState('จิตอาสาและความรับผิดชอบ');
  const [scoreDelta, setScoreDelta] = useState(15);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google Sheets Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  // Deletion modal
  const [recordToDelete, setRecordToDelete] = useState<BehaviorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (studentList.length > 0 && (!selectedStudentId || !studentList.some((s) => s.id === selectedStudentId))) {
      setSelectedStudentId(studentList[0].id);
    }
  }, [studentList.length, selectedStudentId]);

  const positiveCategories = [
    { name: 'จิตอาสาและความรับผิดชอบ', points: 15 },
    { name: 'การมีส่วนร่วมและกล้าแสดงออก', points: 10 },
    { name: 'ทำงานกลุ่มยอดเยี่ยม', points: 15 },
    { name: 'ความซื่อสัตย์และมีวินัย', points: 20 },
    { name: 'ส่งงานล่วงหน้า / ใส่ใจการเรียน', points: 10 },
    { name: 'ช่วยเหลือเพื่อนร่วมชั้นเรียน', points: 10 },
  ];

  const improvementCategories = [
    { name: 'พูดคุยรบกวนสมาธิเพื่อน', points: -5 },
    { name: 'ส่งงานล่าช้ากว่ากำหนด', points: -5 },
    { name: 'ไม่นำอุปกรณ์การเรียนมา', points: -5 },
    { name: 'ขาดความร่วมมือในกิจกรรมกลุ่ม', points: -10 },
    { name: 'เข้าเรียนสายโดยไม่มีเหตุจำเป็น', points: -5 },
    { name: 'ใช้โทรศัพท์ระหว่างการเรียนการสอน', points: -5 },
  ];

  const handleSelectCategory = (cat: { name: string; points: number }) => {
    setCategory(cat.name);
    setScoreDelta(cat.points);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom) return;
    const student = studentList.find((s) => s.id === selectedStudentId);
    if (!student) return;

    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const record: BehaviorRecord = {
        id: `beh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        classroomId: classroom.id,
        studentId: student.id,
        studentName: student.name,
        type,
        category,
        scoreDelta: Number(scoreDelta),
        note: note.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      await addBehaviorRecord(record);
      setNote('');
      setSuccessMessage(`บันทึกพฤติกรรมของ ${student.name} (${scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} แต้ม) เรียบร้อยแล้ว`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBehaviorRecord(recordToDelete.id);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Error deleting behavior:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <HeartHandshake className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับบันทึกพฤติกรรม</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาสร้างหรือเลือกห้องเรียน เพื่อเริ่มบันทึกแต้มความดีและพฤติกรรมของนักเรียน
        </p>
      </div>
    );
  }

  const filteredBehaviors = behaviors.filter((b) => {
    if (filterStudent === 'all') return true;
    return b.studentId === filterStudent;
  });

  // Calculate stats for Google Sheets Export
  const exportList = exportScope === 'all' ? behaviors : filteredBehaviors;
  const positiveCount = exportList.filter((b) => b.type === 'positive').length;
  const improvementCount = exportList.filter((b) => b.type === 'needs_improvement').length;
  const totalNetPoints = exportList.reduce((acc, b) => acc + (b.scoreDelta || 0), 0);

  const generateSheetRows = () => {
    return exportList.map((b, idx) => {
      const student = studentList.find((s) => s.id === b.studentId);
      const studentIdCode = student?.studentId || b.studentId;
      const typeLabel = b.type === 'positive' ? 'พฤติกรรมเชิงบวก (+)' : 'พฤติกรรมที่ควรพัฒนา (-)';
      const formattedPoints = b.scoreDelta > 0 ? `+${b.scoreDelta}` : String(b.scoreDelta);
      const curPts = student?.totalPoints !== undefined ? student.totalPoints : '-';

      return {
        index: idx + 1,
        date: b.date,
        studentId: studentIdCode,
        studentName: b.studentName,
        grade: student?.grade || '-',
        type: typeLabel,
        category: b.category,
        scoreDelta: formattedPoints,
        note: b.note || '-',
        totalStudentPoints: curPts,
        createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : b.date,
      };
    });
  };

  const handleDownloadCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Thai language support
    const headers = [
      'ลำดับ',
      'วันที่บันทึก',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ชั้น/ห้อง',
      'ประเภทพฤติกรรม',
      'หัวข้อพฤติกรรม',
      'แต้มที่ปรับ',
      'รายละเอียด/บันทึกเพิ่มเติม',
      'แต้มสะสมปัจจุบันของนักเรียน',
      'วันเวลาที่บันทึก',
    ];
    csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

    const rows = generateSheetRows();
    rows.forEach((r) => {
      const rowVals = [
        r.index,
        r.date,
        r.studentId,
        r.studentName,
        r.grade,
        r.type,
        r.category,
        r.scoreDelta,
        r.note,
        r.totalStudentPoints,
        r.createdAt,
      ];
      csvContent += rowVals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const roomName = (classroom.name || 'ห้องเรียน').replace(/\s+/g, '_');
    link.download = `รายงานพฤติกรรมนักเรียน_${roomName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyTSV = () => {
    const headers = [
      'ลำดับ',
      'วันที่บันทึก',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ชั้น/ห้อง',
      'ประเภทพฤติกรรม',
      'หัวข้อพฤติกรรม',
      'แต้มที่ปรับ',
      'รายละเอียด/บันทึกเพิ่มเติม',
      'แต้มสะสมปัจจุบัน',
    ];
    let tsv = headers.join('\t') + '\n';

    const rows = generateSheetRows();
    rows.forEach((r) => {
      const rowVals = [
        r.index,
        r.date,
        r.studentId,
        r.studentName,
        r.grade,
        r.type,
        r.category,
        r.scoreDelta,
        r.note,
        r.totalStudentPoints,
      ];
      tsv += rowVals.join('\t') + '\n';
    });

    navigator.clipboard.writeText(tsv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">บันทึกพฤติกรรมและการมีส่วนร่วม</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            เสริมแรงบวกด้วยแต้มพฤติกรรมดี ติดตามพัฒนาการทางอารมณ์และสังคม (SEL) พร้อมส่งออก Google Sheets
          </p>
        </div>

        <button
          type="button"
          id="btn-export-behavior-sheet"
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>สรุปรายงานเป็น Google Sheets</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Record Form */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>เพิ่มบันทึกพฤติกรรม</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                เลือกนักเรียน *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 font-medium"
              >
                {studentList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentId || 'ไม่มีรหัส'})
                  </option>
                ))}
              </select>
            </div>

            {/* Type selector */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ประเภทพฤติกรรม
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('positive');
                    handleSelectCategory(positiveCategories[0]);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'positive'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>พฤติกรรมเชิงบวก (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('needs_improvement');
                    handleSelectCategory(improvementCategories[0]);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'needs_improvement'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>ควรพัฒนา (-)</span>
                </button>
              </div>
            </div>

            {/* Quick Category chips */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                เลือกหัวข้อสำเร็จรูป
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(type === 'positive' ? positiveCategories : improvementCategories).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleSelectCategory(c)}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                      category === c.name
                        ? type === 'positive'
                          ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-900'
                          : 'border-amber-500 bg-amber-50 font-semibold text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="font-bold">{c.points > 0 ? `+${c.points}` : c.points} แต้ม</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                รายละเอียด / บันทึกเพิ่มเติม
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ระบุเหตุการณ์ วันที่ หรือคำชมเชยประกอบ..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกพฤติกรรมและปรับแต้ม'}</span>
            </button>
          </form>
        </div>

        {/* Right 2 Cols: History of behavior logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  ประวัติบันทึกพฤติกรรม ({filteredBehaviors.length} รายการ)
                </h2>
                <p className="text-[11px] text-slate-500">
                  ข้อมูลอัปเดตแบบเรียลไทม์ ซิงค์ลงฐานข้อมูลคลาวด์ทุกเครื่อง
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                >
                  <option value="all">นักเรียนทุกคน ({studentList.length} คน)</option>
                  {studentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredBehaviors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                ยังไม่มีบันทึกพฤติกรรมตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredBehaviors.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{b.studentName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            b.type === 'positive'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.category}
                        </span>
                      </div>
                      {b.note && <p className="text-slate-600 text-[11px] italic">"{b.note}"</p>}
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>วันที่: {b.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                          b.scoreDelta > 0 ? 'text-emerald-700 bg-emerald-100/70' : 'text-rose-700 bg-rose-100/70'
                        }`}
                      >
                        {b.scoreDelta > 0 ? `+${b.scoreDelta}` : b.scoreDelta} แต้ม
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(b)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบบันทึกพฤติกรรมนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Sheets Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="font-bold text-base">สรุปรายงานพฤติกรรมนักเรียนเป็น Google Sheets</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Statistics Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">เชิงบวก (+)</span>
                  <span className="text-xl font-extrabold text-emerald-700">{positiveCount}</span>
                  <span className="text-[10px] text-emerald-600 block">รายการ</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">ควรพัฒนา (-)</span>
                  <span className="text-xl font-extrabold text-amber-700">{improvementCount}</span>
                  <span className="text-[10px] text-amber-600 block">รายการ</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">แต้มสุทธิรวม</span>
                  <span className="text-xl font-extrabold text-purple-700">
                    {totalNetPoints > 0 ? `+${totalNetPoints}` : totalNetPoints}
                  </span>
                  <span className="text-[10px] text-purple-600 block">แต้ม</span>
                </div>
              </div>

              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  ขอบเขตข้อมูลที่ต้องการส่งออก
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ประวัติทั้งหมด ({behaviors.length} รายการ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('filtered')}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      exportScope === 'filtered'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    เฉพาะที่เลือกตัวกรอง ({filteredBehaviors.length} รายการ)
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                  <span>ตัวอย่างตารางที่จะส่งออก ({exportList.length} รายการ):</span>
                  <span className="text-[10px] text-slate-400 font-normal">รองรับภาษาไทย 100% ไม่เพี้ยน</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2 border-b">วันที่</th>
                        <th className="p-2 border-b">ชื่อนักเรียน</th>
                        <th className="p-2 border-b">ประเภท</th>
                        <th className="p-2 border-b">หัวข้อ</th>
                        <th className="p-2 border-b text-right">แต้ม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {exportList.slice(0, 10).map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-2">{b.date}</td>
                          <td className="p-2 font-medium">{b.studentName}</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                b.type === 'positive' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.type === 'positive' ? '+' : '-'}
                            </span>
                          </td>
                          <td className="p-2 truncate max-w-[150px]">{b.category}</td>
                          <td className="p-2 text-right font-bold">
                            {b.scoreDelta > 0 ? `+${b.scoreDelta}` : b.scoreDelta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {exportList.length > 10 && (
                    <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">
                      และอีก {exportList.length - 10} รายการ...
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>สร้างสเปรดชีตใหม่ (sheets.new)</span>
                </a>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyTSV}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copySuccess ? 'คัดลอกเรียบร้อย!' : 'คัดลอกสำหรับวาง (Ctrl+V)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์ CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบบันทึกพฤติกรรม?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ต้องการลบบันทึกพฤติกรรม <strong className="text-slate-900">"{recordToDelete.category}"</strong> ของ <strong className="text-slate-900">{recordToDelete.studentName}</strong> วันที่ {recordToDelete.date} หรือไม่?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-semibold text-xs text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

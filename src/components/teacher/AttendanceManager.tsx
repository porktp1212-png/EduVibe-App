import React, { useState, useEffect, useMemo } from 'react';
import type { Classroom, AttendanceRecord, UserProfile } from '../../types';
import { saveAttendance } from '../../services/firestoreService';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  UserX,
  FileSpreadsheet,
  Save,
  CheckCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  User,
  Download,
  Copy,
  ExternalLink,
  X,
  Table,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';

interface AttendanceManagerProps {
  classroom: Classroom | null;
  attendanceRecords: AttendanceRecord[];
  students?: UserProfile[];
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  classroom,
  attendanceRecords,
  students,
}) => {
  const studentList = (students || []).filter(Boolean);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Current date's record
  const currentRecord = attendanceRecords.find((r) => r.date === selectedDate);
  const [recordsState, setRecordsState] = useState<
    Record<string, { status: 'present' | 'late' | 'absent' | 'leave'; note?: string }>
  >({});

  useEffect(() => {
    if (currentRecord?.records) {
      setRecordsState(currentRecord.records);
    } else {
      // Default to present for everyone
      const initial: Record<string, { status: 'present' | 'late' | 'absent' | 'leave' }> = {};
      studentList.forEach((s) => {
        if (s && s.id) {
          initial[s.id] = { status: 'present' };
        }
      });
      setRecordsState(initial);
    }
  }, [currentRecord, selectedDate, studentList.length]);

  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'absent' | 'leave') => {
    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: 'present' | 'late' | 'absent' | 'leave' }> = {};
    studentList.forEach((s) => {
      if (s && s.id) {
        updated[s.id] = { status: 'present' };
      }
    });
    setRecordsState(updated);
  };

  const handleSave = async () => {
    if (!classroom) return;
    setIsSaving(true);
    try {
      const record: AttendanceRecord = {
        id: `att_${classroom.id}_${selectedDate}`,
        classroomId: classroom.id,
        date: selectedDate,
        checkedAt: new Date().toISOString(),
        records: recordsState,
      };
      await saveAttendance(record);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <CalendarCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับเช็คชื่อ</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาสร้างหรือเลือกห้องเรียน เพื่อเริ่มบันทึกการเช็คชื่อเข้าเรียนของนักเรียน
        </p>
      </div>
    );
  }

  // Stats for daily view
  const statuses = Object.values(recordsState) as Array<{ status: string; note?: string }>;
  const presentCount = statuses.filter((s) => s.status === 'present').length;
  const lateCount = statuses.filter((s) => s.status === 'late').length;
  const leaveCount = statuses.filter((s) => s.status === 'leave').length;
  const absentCount = statuses.filter((s) => s.status === 'absent').length;
  const totalCount = studentList.length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 100;

  // Real-time cumulative attendance calculation per student for Google Sheets
  const summaryData = useMemo(() => {
    const classroomRecords = attendanceRecords.filter((r) => r.classroomId === classroom.id);
    const hasHistory = classroomRecords.length > 0;

    return studentList.map((std, idx) => {
      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;

      if (hasHistory) {
        classroomRecords.forEach((rec) => {
          const s = rec.records?.[std.id];
          if (s) {
            if (s.status === 'present') present++;
            else if (s.status === 'late') late++;
            else if (s.status === 'leave') leave++;
            else if (s.status === 'absent') absent++;
          } else {
            present++; // Default present
          }
        });
      } else {
        // Fallback to today's active check state
        const cur = recordsState[std.id]?.status || 'present';
        if (cur === 'present') present = 1;
        else if (cur === 'late') late = 1;
        else if (cur === 'leave') leave = 1;
        else if (cur === 'absent') absent = 1;
      }

      const total = present + late + leave + absent;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
      const statusText = rate >= 90 ? 'ดีเยี่ยม' : rate >= 80 ? 'ผ่านเกณฑ์' : 'ต้องติดตาม';

      return {
        id: std.id,
        index: idx + 1,
        studentId: std.studentId || `${idx + 1}`.padStart(5, '0'),
        name: std.name || 'นักเรียน',
        present,
        late,
        leave,
        absent,
        total,
        rate,
        statusText,
      };
    });
  }, [studentList, attendanceRecords, classroom.id, recordsState]);

  const totalRecordedDays = useMemo(() => {
    const dates = new Set(
      attendanceRecords.filter((r) => r.classroomId === classroom.id).map((r) => r.date)
    );
    return Math.max(dates.size, 1);
  }, [attendanceRecords, classroom.id]);

  const avgAttendanceRate = useMemo(() => {
    if (summaryData.length === 0) return 100;
    const sum = summaryData.reduce((acc, curr) => acc + curr.rate, 0);
    return Math.round(sum / summaryData.length);
  }, [summaryData]);

  // 1-Click Export to CSV (Formatted for Google Sheets & Excel with UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      'ลำดับ',
      'เลขประจำตัว',
      'ชื่อ - นามสกุล',
      'มาเรียน (วัน)',
      'สาย (วัน)',
      'ลา (วัน)',
      'ขาด (วัน)',
      'รวมวันเรียนทั้งหมด (วัน)',
      'เปอร์เซ็นต์เข้าเรียน (%)',
      'สถานะประเมิน',
    ];

    const rows = summaryData.map((s) => [
      s.index,
      `"${s.studentId}"`,
      `"${s.name}"`,
      s.present,
      s.late,
      s.leave,
      s.absent,
      s.total,
      `"${s.rate}%"`,
      `"${s.statusText}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `สรุปผลเช็คชื่อ_${classroom.name.replace(/\s+/g, '_')}_GoogleSheet_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Copy Tab-Separated Values for pasting straight into Google Sheets (Ctrl+V)
  const handleCopyTSV = async () => {
    const headers = [
      'ลำดับ',
      'เลขประจำตัว',
      'ชื่อ - นามสกุล',
      'มาเรียน (วัน)',
      'สาย (วัน)',
      'ลา (วัน)',
      'ขาด (วัน)',
      'รวมวันเรียน',
      'เปอร์เซ็นต์เข้าเรียน',
      'สถานะประเมิน',
    ];

    const rows = summaryData.map((s) => [
      s.index,
      s.studentId,
      s.name,
      s.present,
      s.late,
      s.leave,
      s.absent,
      s.total,
      `${s.rate}%`,
      s.statusText,
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ระบบเช็คชื่อนักเรียนแบบเรียลไทม์</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกการมาเรียน ขาด ลา มาสาย เชื่อมต่อฐานข้อมูลพร้อมสรุปผล Google Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              id="btn-att-daily"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'daily' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เช็คชื่อรายวัน
            </button>
            <button
              type="button"
              id="btn-att-monthly"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'monthly' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สรุปผลรายเดือน
            </button>
          </div>

          {/* Google Sheet Summary Button */}
          <button
            type="button"
            id="btn-open-google-sheet-summary"
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="เปิดรายงานสรุปผล Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>สรุปผล Google Sheets</span>
          </button>

          {/* Date Picker (in Daily Mode) */}
          {viewMode === 'daily' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                id="att-date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                id="btn-att-save"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : saveSuccess ? 'บันทึกสำเร็จ!' : 'บันทึกเรียลไทม์'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* Daily Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">เปอร์เซ็นต์เข้าเรียน</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{attendanceRate}%</div>
              <div className="text-[10px] text-teal-600 font-medium">เกณฑ์ปกติ &ge; 80%</div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-800">มาเรียน (Present)</span>
              <div className="text-xl font-bold text-emerald-900 mt-1">{presentCount} คน</div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-800">สาย (Late)</span>
              <div className="text-xl font-bold text-amber-900 mt-1">{lateCount} คน</div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-[11px] font-semibold text-blue-800">ลา (Leave)</span>
              <div className="text-xl font-bold text-blue-900 mt-1">{leaveCount} คน</div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-rose-800">ขาด (Absent)</span>
              <div className="text-xl font-bold text-rose-900 mt-1">{absentCount} คน</div>
            </div>
          </div>

          {/* Attendance Check-in Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700">
                รายชื่อนักเรียน ({studentList.length} คน)
              </div>
              <button
                type="button"
                id="btn-mark-all-present"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200/80 text-emerald-800 text-xs font-semibold transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>เช็คมาเรียนทุกคน</span>
              </button>
            </div>

            {studentList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">ยังไม่มีรายชื่อนักเรียนในห้องเรียนนี้</p>
                <p className="text-xs text-slate-400 mt-1">
                  เมื่อนักเรียนเข้าร่วมห้องเรียนด้วยรหัส <span className="font-mono font-bold text-slate-700">{classroom.code}</span> หรือคุณครูเพิ่มนักเรียน รายชื่อจะแสดงที่นี่เพื่อเช็คชื่อ
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentList.map((student, idx) => {
                const cur = recordsState[student.id] || { status: 'present' };

                return (
                  <div
                    key={student.id}
                    id={`attendance-row-${student.id}`}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}.</span>
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-500">รหัสนักเรียน: {student.studentId} | {student.grade}</div>
                      </div>
                    </div>

                    {/* Status Button Group */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`btn-status-present-${student.id}`}
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          cur.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>มา</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-status-late-${student.id}`}
                        onClick={() => handleStatusChange(student.id, 'late')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          cur.status === 'late'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>สาย</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-status-leave-${student.id}`}
                        onClick={() => handleStatusChange(student.id, 'leave')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          cur.status === 'leave'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>ลา</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-status-absent-${student.id}`}
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          cur.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <UserX className="w-3 h-3" />
                        <span>ขาด</span>
                      </button>
                    </div>

                    {/* Note Input */}
                    <div className="grow md:max-w-xs">
                      <input
                        type="text"
                        placeholder="หมายเหตุ (เช่น ลาป่วย, รถเสีย)..."
                        value={cur.note || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </>
      ) : (
        /* Monthly Attendance Summary */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>รายงานสรุปผลการเข้าเรียนสะสม ({classroom.name})</span>
              </h2>
              <p className="text-xs text-slate-500">
                สถิติจำนวนวันมาเรียน สาย ลา และเปอร์เซ็นต์ความสม่ำเสมอของนักเรียนทุกคน
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอกตาราง'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>สรุปผล Google Sheets</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">เลขที่ / รหัส</th>
                  <th className="py-3 px-3">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-3 text-center">มาเรียน (วัน)</th>
                  <th className="py-3 px-3 text-center">สาย (วัน)</th>
                  <th className="py-3 px-3 text-center">ลา (วัน)</th>
                  <th className="py-3 px-3 text-center">ขาด (วัน)</th>
                  <th className="py-3 px-3 text-center">รวมวันเรียน</th>
                  <th className="py-3 px-3 text-center">ความสม่ำเสมอ</th>
                  <th className="py-3 px-3 text-center">สถานะประเมิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryData.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 font-medium">
                      #{std.index} ({std.studentId})
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{std.name}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{std.present}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">{std.late}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{std.leave}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{std.absent}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{std.total}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              std.rate >= 90
                                ? 'bg-emerald-500'
                                : std.rate >= 80
                                ? 'bg-teal-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${std.rate}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-800">{std.rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          std.rate >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : std.rate >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {std.statusText}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google Sheets Summary Modal */}
      {isGoogleSheetsModalOpen && (
        <div
          id="google-sheets-summary-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div
            id="google-sheets-summary-card"
            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-md">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>สรุปผล Google Sheets & Excel</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold mt-0.5">
                    รายงานสรุปผลการเข้าเรียน: {classroom.name}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-google-sheets-modal"
                onClick={() => setIsGoogleSheetsModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-medium text-slate-500">จำนวนนักเรียนทั้งหมด</span>
                <p className="text-lg font-bold text-slate-800">{studentList.length} คน</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-medium text-slate-500">อัตราการเข้าเรียนเฉลี่ย</span>
                <p className="text-lg font-bold text-emerald-700">{avgAttendanceRate}%</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-medium text-slate-500">เกณฑ์ดีเยี่ยม (&ge;90%)</span>
                <p className="text-lg font-bold text-teal-700">
                  {summaryData.filter((s) => s.rate >= 90).length} คน
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-medium text-slate-500">บันทึกแล้วทั้งหมด</span>
                <p className="text-lg font-bold text-slate-800">{totalRecordedDays} วันเรียน</p>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-tsv-google-sheet"
                  onClick={handleCopyTSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copySuccess ? 'คัดลอกตารางแล้ว! (พร้อมกด Ctrl+V)' : 'คัดลอกตารางสำหรับวางใน Google Sheets'}</span>
                </button>

                <button
                  type="button"
                  id="btn-download-csv-google-sheet"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>ดาวน์โหลด CSV (UTF-8 สำหรับ Google Sheets / Excel)</span>
                </button>
              </div>

              <a
                href="https://sheets.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>เปิด Google Sheets ใหม่</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>

            {/* Instruction Tip */}
            <div className="px-5 py-2 bg-blue-50/70 border-b border-blue-100 text-[11px] text-blue-800 flex items-center gap-2 shrink-0">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>เคล็ดลับ:</strong> คลิกปุ่ม "คัดลอกตาราง" ด้านบน แล้วเปิดหน้า Google Sheets ว่าง จากนั้นกด <strong>Ctrl + V</strong> ข้อมูลจะถูกจัดลงตารางและคอลัมน์อย่างถูกต้องสมบูรณ์ทันที
              </span>
            </div>

            {/* Table Preview (Spreadsheet Styled) */}
            <div className="overflow-auto grow p-4">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <thead className="bg-emerald-50 text-emerald-950 uppercase font-bold sticky top-0 border-b border-emerald-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center w-12">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200">เลขประจำตัว</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center bg-emerald-100/60">มา (วัน)</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center bg-amber-100/60">สาย (วัน)</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center bg-blue-100/60">ลา (วัน)</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center bg-rose-100/60">ขาด (วัน)</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center">รวมวันเรียน</th>
                    <th className="py-2.5 px-3 border-r border-emerald-200 text-center">เปอร์เซ็นต์</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.map((std, i) => (
                    <tr key={std.id} className={i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-500">{std.index}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium text-slate-700">{std.studentId}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">{std.name}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-emerald-700">{std.present}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-amber-700">{std.late}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-blue-700">{std.leave}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-rose-700">{std.absent}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-semibold text-slate-800">{std.total}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-900">{std.rate}%</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            std.rate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : std.rate >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {std.statusText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                ข้อมูลสรุปผลอัปเดตอัตโนมัติตามการบันทึกการเช็คชื่อแบบเรียลไทม์
              </span>
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

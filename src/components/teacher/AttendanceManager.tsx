import React, { useState, useEffect } from 'react';
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
            บันทึกการมาเรียน ขาด ลา มาสาย พร้อมสรุปผลรายเดือนอัตโนมัติ
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
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>รายงานสรุปผลการเข้าเรียนรายเดือน (กันยายน 2569)</span>
              </h2>
              <p className="text-xs text-slate-500">
                สรุปสถิติจำนวนวันมาเรียน สาย ลา และเปอร์เซ็นต์ความสม่ำเสมอของนักเรียนทุกคน
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl self-start">
              จำนวนวันเรียนทั้งหมดในเดือน: 20 วัน
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
                  <th className="py-3 px-3 text-center">ความสม่ำเสมอ</th>
                  <th className="py-3 px-3 text-center">สถานะประเมิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentList.map((std, i) => {
                  // Mock cumulative monthly stats
                  const simulated = [
                    { present: 19, late: 1, leave: 0, absent: 0, pct: 98 },
                    { present: 17, late: 2, leave: 1, absent: 0, pct: 92 },
                    { present: 20, late: 0, leave: 0, absent: 0, pct: 100 },
                    { present: 16, late: 1, leave: 2, absent: 1, pct: 85 },
                  ][i] || { present: 18, late: 1, leave: 1, absent: 0, pct: 95 };

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500 font-medium">
                        #{i + 1} ({std.studentId})
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{std.name}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{simulated.present}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">{simulated.late}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">{simulated.leave}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{simulated.absent}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                simulated.pct >= 90
                                  ? 'bg-emerald-500'
                                  : simulated.pct >= 80
                                  ? 'bg-teal-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${simulated.pct}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-slate-800">{simulated.pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            simulated.pct >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {simulated.pct >= 90 ? 'ดีเยี่ยม' : 'ผ่านเกณฑ์'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

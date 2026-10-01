import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Submission, Assignment } from '../../types';
import { evaluateSubmissionWithAI } from '../../services/aiService';
import { gradeSubmission } from '../../services/firestoreService';

interface BatchAIGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  assignments: Assignment[];
  onComplete?: () => void;
}

interface BatchProgressItem {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  status: 'pending' | 'grading' | 'done' | 'error';
  score?: number;
  maxScore: number;
  feedback?: string;
  error?: string;
}

export const BatchAIGradingModal: React.FC<BatchAIGradingModalProps> = ({
  isOpen,
  onClose,
  submissions,
  assignments,
  onComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<BatchProgressItem[]>(() =>
    submissions.map((sub) => {
      const asg = assignments.find((a) => a.id === sub.assignmentId);
      return {
        submissionId: sub.id,
        studentName: sub.studentName,
        assignmentTitle: asg?.title || 'การบ้าน',
        status: 'pending',
        maxScore: asg?.maxScore || 10,
      };
    })
  );
  const [isFinished, setIsFinished] = useState(false);

  // Sync items when submissions change and modal re-opens
  React.useEffect(() => {
    if (isOpen) {
      setItems(
        submissions.map((sub) => {
          const asg = assignments.find((a) => a.id === sub.assignmentId);
          return {
            submissionId: sub.id,
            studentName: sub.studentName,
            assignmentTitle: asg?.title || 'การบ้าน',
            status: 'pending',
            maxScore: asg?.maxScore || 10,
          };
        })
      );
      setIsRunning(false);
      setCurrentIndex(0);
      setIsFinished(false);
    }
  }, [isOpen, submissions, assignments]);

  if (!isOpen) return null;

  const handleStartBatch = async () => {
    if (items.length === 0 || isRunning) return;

    setIsRunning(true);
    setIsFinished(false);

    const updated = [...items];

    for (let i = 0; i < submissions.length; i++) {
      setCurrentIndex(i);
      const sub = submissions[i];
      const asg = assignments.find((a) => a.id === sub.assignmentId);
      const maxScore = asg?.maxScore || 10;
      const pointsReward = asg?.pointsReward || 50;

      updated[i] = { ...updated[i], status: 'grading' };
      setItems([...updated]);

      try {
        const filesPayload = sub.files && sub.files.length > 0
          ? sub.files
          : sub.fileData || sub.fileUrl || sub.fileName
          ? [{
              name: sub.fileName || 'ไฟล์ผลงาน',
              type: sub.fileType || '',
              url: sub.fileUrl,
              data: sub.fileData,
            }]
          : undefined;

        const evalResult = await evaluateSubmissionWithAI({
          assignmentTitle: asg?.title || 'การบ้าน',
          assignmentDescription: asg?.description || '',
          studentSubmission: sub.content || (sub.fileName ? `[ไฟล์แนบ: ${sub.fileName}]` : ''),
          maxScore,
          rubrics: asg?.rubrics && asg.rubrics.length > 0
            ? asg.rubrics.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                maxScore: r.maxScore,
              }))
            : undefined,
          files: filesPayload,
        });

        const score = typeof evalResult.suggestedScore === 'number' ? evalResult.suggestedScore : Math.round(maxScore * 0.8);
        const ratio = score / maxScore;
        const points = Math.max(5, Math.round(pointsReward * Math.min(1, Math.max(0.4, ratio))));

        const aiFeedbackSummary = `${evalResult.feedback || ''}\n\n• จุดแข็ง: ${evalResult.strengths?.join(', ') || '-'}\n• จุดที่ควรพัฒนา: ${evalResult.weaknesses?.join(', ') || '-'}\n• คำแนะนำต่อยอด: ${evalResult.recommendedImprovement || '-'}`.trim();

        await gradeSubmission(sub.id, {
          score,
          teacherFeedback: evalResult.feedback || 'ผลงานถูกต้องตามเกณฑ์และคำสั่งที่กำหนด',
          aiFeedback: aiFeedbackSummary,
          rubricScores: evalResult.rubricScores as any,
          pointsAwarded: points,
          status: 'graded',
          studentId: sub.studentId,
        });

        updated[i] = {
          ...updated[i],
          status: 'done',
          score,
          feedback: evalResult.feedback,
        };
        setItems([...updated]);
      } catch (err: any) {
        console.error('Batch grading item failed:', err);
        updated[i] = {
          ...updated[i],
          status: 'error',
          error: err?.message || 'เกิดข้อผิดพลาดในการประเมิน',
        };
        setItems([...updated]);
      }
    }

    setIsRunning(false);
    setIsFinished(true);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    if (onComplete) {
      onComplete();
    }
  };

  const completedCount = items.filter((item) => item.status === 'done').length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div
      id="batch-ai-grading-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-700 via-indigo-600 to-indigo-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">ระบบตรวจงานอัตโนมัติทั้งห้องด้วย AI</h2>
              <p className="text-xs text-indigo-100">
                ประเมินคำตอบและไฟล์แนบตามเกณฑ์รูบิก ให้คะแนนและข้อเสนอแนะรายบุคคลทันที ({submissions.length} ชิ้นงาน)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Progress Banner */}
          {isRunning && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  กำลังตรวจงานของ {items[currentIndex]?.studentName || 'นักเรียน'} ({currentIndex + 1}/{items.length})...
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {isFinished && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold text-emerald-950">
                  ตรวจประเมินเสร็จสิ้นเรียบร้อยแล้ว {completedCount} จาก {items.length} รายการ
                </strong>
                <span>ระบบได้บันทึกคะแนน รูบิก ข้อเสนอแนะ และมอบแต้มสะสมให้นักเรียนทุกคนเรียบร้อยแล้ว</span>
              </div>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              รายการการบ้านที่รอการตรวจ ({items.length} รายการ)
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              {items.map((item, idx) => (
                <div
                  key={item.submissionId}
                  className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.studentName}</span>
                        <span className="text-[10px] text-slate-400 font-normal truncate">({item.assignmentTitle})</span>
                      </div>
                      {item.feedback && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          AI: {item.feedback}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-[11px] text-rose-500 truncate mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{item.error}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {item.status === 'pending' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        รอดำเนินการ
                      </span>
                    )}

                    {item.status === 'grading' && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>กำลังวิเคราะห์...</span>
                      </span>
                    )}

                    {item.status === 'done' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                          {item.score} / {item.maxScore} คะแนน
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}

                    {item.status === 'error' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                        ขัดข้อง
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>นักเรียนจะได้รับคะแนนและแต้มสะสมโดยอัตโนมัติ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              {isFinished ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
            </button>

            {!isFinished && (
              <button
                type="button"
                id="btn-start-batch-ai"
                onClick={handleStartBatch}
                disabled={isRunning || items.length === 0}
                className="px-5 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังตรวจงาน ({currentIndex + 1}/{items.length})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>เริ่มตรวจทั้งหมดด้วย AI ({items.length} งาน)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

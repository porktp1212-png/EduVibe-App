import React, { useState, useEffect } from 'react';
import type { Assignment, Submission, RubricCriterion, RubricScoreItem, AttachedFile } from '../../types';
import { gradeSubmission } from '../../services/firestoreService';
import { evaluateSubmissionWithAI } from '../../services/aiService';
import {
  Sparkles,
  CheckCircle2,
  X,
  AlertTriangle,
  Lightbulb,
  Award,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  BrainCircuit,
  Loader2,
  Plus,
  Trash2,
  Paperclip,
  File,
  FileText,
  Eye,
  Download,
  CheckSquare,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { FileListDisplay } from '../common/FileListDisplay';
import { UniversalFileViewerModal } from '../common/UniversalFileViewerModal';

interface AIGradingModalProps {
  submission: Submission | null;
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AIGradingModal: React.FC<AIGradingModalProps> = ({
  submission,
  assignment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !submission || !assignment) return null;

  // Initialize Rubrics from assignment or sensible defaults totaling assignment.maxScore
  const getInitialRubrics = (): RubricCriterion[] => {
    if (assignment.rubrics && assignment.rubrics.length > 0) {
      return [...assignment.rubrics];
    }
    const max = assignment.maxScore || 10;
    const p1 = Math.max(1, Math.round(max * 0.5));
    const p2 = Math.max(1, Math.round(max * 0.3));
    const p3 = Math.max(1, max - p1 - p2);
    return [
      { id: 'crit_1', title: 'ความถูกต้องและครบถ้วนของเนื้อหา', description: 'ตอบตรงประเด็นและมีความถูกต้อง', maxScore: p1 },
      { id: 'crit_2', title: 'การวิเคราะห์และเหตุผลประกอบ', description: 'แสดงกระบวนการคิดและเหตุผลสนับสนุน', maxScore: p2 },
      { id: 'crit_3', title: 'การจัดระเบียบและความคิดสร้างสรรค์', description: 'นำเสนอเป็นระบบ ประณีต เข้าใจง่าย', maxScore: p3 },
    ];
  };

  const [rubrics, setRubrics] = useState<RubricCriterion[]>(getInitialRubrics);
  const [rubricScores, setRubricScores] = useState<RubricScoreItem[]>(() => {
    if (submission.rubricScores && submission.rubricScores.length > 0) {
      return submission.rubricScores;
    }
    return [];
  });

  const [score, setScore] = useState<number>(submission.score ?? Math.round(assignment.maxScore * 0.8));
  const [teacherFeedback, setTeacherFeedback] = useState<string>(submission.teacherFeedback || '');
  const [pointsToAward, setPointsToAward] = useState<number>(submission.pointsAwarded || assignment.pointsReward || 50);

  // AI Evaluation State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    suggestedScore: number;
    rubricScores?: RubricScoreItem[];
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    recommendedImprovement: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  const [showRubricEditor, setShowRubricEditor] = useState(true);

  // Reset or initialize when submission changes
  useEffect(() => {
    setRubrics(getInitialRubrics());
    if (submission.rubricScores && submission.rubricScores.length > 0) {
      setRubricScores(submission.rubricScores);
    }
  }, [submission?.id, assignment?.id]);

  const attachedFiles: AttachedFile[] =
    submission.files && Array.isArray(submission.files) && submission.files.length > 0
      ? submission.files
      : submission.fileData || submission.fileUrl || submission.fileName
      ? [
          {
            name: submission.fileName || 'ไฟล์ผลงาน',
            type: submission.fileType || 'application/octet-stream',
            size: submission.fileSize || 0,
            url: submission.fileUrl,
            data: submission.fileData,
            uploadStatus: 'ready',
          },
        ]
      : [];

  const handleAddCriterion = () => {
    const newId = `crit_${Date.now()}`;
    setRubrics([
      ...rubrics,
      { id: newId, title: 'เกณฑ์การให้คะแนนใหม่', description: 'คำอธิบายเกณฑ์', maxScore: 5 },
    ]);
  };

  const handleRemoveCriterion = (id: string) => {
    setRubrics(rubrics.filter((r) => r.id !== id));
    setRubricScores(rubricScores.filter((rs) => rs.criterionId !== id));
  };

  const handleUpdateCriterion = (id: string, updates: Partial<RubricCriterion>) => {
    setRubrics(rubrics.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleRubricScoreChange = (criterionId: string, title: string, maxScore: number, newScore: number) => {
    const clampedScore = Math.max(0, Math.min(maxScore, newScore));
    let nextScores: RubricScoreItem[];

    const existingIndex = rubricScores.findIndex((s) => s.criterionId === criterionId);
    if (existingIndex >= 0) {
      nextScores = rubricScores.map((s, idx) =>
        idx === existingIndex ? { ...s, score: clampedScore } : s
      );
    } else {
      nextScores = [...rubricScores, { criterionId, title, score: clampedScore, maxScore }];
    }

    setRubricScores(nextScores);

    // Recompute total score based on rubric total
    const totalRubricScore = nextScores.reduce((acc, curr) => acc + (curr.score || 0), 0);
    setScore(totalRubricScore);
  };

  const handleRunAiEvaluation = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const data = await evaluateSubmissionWithAI({
        assignmentTitle: assignment.title,
        assignmentDescription: assignment.description,
        studentSubmission: submission.content || (submission.fileName ? `[ไฟล์แนบ: ${submission.fileName}]` : ''),
        maxScore: assignment.maxScore,
        rubrics: rubrics.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          maxScore: r.maxScore,
        })),
        files: attachedFiles.map((f) => ({
          name: f.name,
          type: f.type,
          url: f.url,
          data: f.data,
        })),
      });

      setAiResult(data);

      if (data.rubricScores && Array.isArray(data.rubricScores) && data.rubricScores.length > 0) {
        setRubricScores(data.rubricScores as any);
      }

      if (typeof data.suggestedScore === 'number') {
        setScore(data.suggestedScore);
      }

      if (data.feedback) {
        setTeacherFeedback((prev) => (prev ? `${prev}\n\n[ข้อเสนอแนะ AI]: ${data.feedback}` : data.feedback));
      }
    } catch (err: any) {
      console.warn('AI evaluation notice:', err);
      setAiError('ระบบ AI ตรวจการบ้านมีข้อขัดข้องชั่วคราว คุณครูสามารถให้คะแนนและบันทึกข้อเสนอแนะได้ตามปกติ');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveGrade = async () => {
    setIsSaving(true);
    try {
      const aiFeedbackSummary = aiResult
        ? `[จุดแข็ง]: ${aiResult.strengths?.join(', ')} | [ข้อควรพัฒนา]: ${aiResult.weaknesses?.join(', ')} | [แนวทางปรับปรุง]: ${aiResult.recommendedImprovement}`
        : '';

      await gradeSubmission(submission.id, {
        score,
        teacherFeedback,
        aiFeedback: aiFeedbackSummary,
        rubricScores: rubricScores.length > 0 ? rubricScores : undefined,
        pointsAwarded: pointsToAward,
        status: 'graded',
        studentId: submission.studentId,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="ai-grading-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <BrainCircuit className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">ตรวจการบ้าน & AI ประเมินผลตามเกณฑ์รูบิก</h2>
              <p className="text-xs text-indigo-100">
                นักเรียน: <strong className="text-white">{submission.studentName}</strong> | {assignment.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Assignment Description & Student Answer */}
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>โจทย์คำสั่งการบ้าน</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{assignment.description}</p>
            </div>

            {/* Student Submission (Text & Attached File) */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>คำตอบและผลงานของนักเรียน: {submission.studentName}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  ส่งเมื่อ: {new Date(submission.submittedAt).toLocaleString('th-TH')}
                </span>
              </div>

              {submission.content && (
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-blue-200/60 shadow-xs">
                  {submission.content}
                </p>
              )}

              {/* Student Uploaded Files Presentation */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                    <span>ไฟล์ผลงานที่นักเรียนแนบมา ({attachedFiles.length} รายการ):</span>
                  </div>
                  <FileListDisplay
                    files={attachedFiles}
                    onPreview={(file) => setViewingFile(file)}
                    readOnly
                  />
                </div>
              )}

              {submission.fileUrl && attachedFiles.length === 0 && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-700">ลิงก์แนบ:</span>
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline font-medium hover:text-blue-800 truncate"
                  >
                    {submission.fileUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Rubric Criteria Config Box */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-xs text-indigo-950">
                  เกณฑ์การประเมินรูบิกสกอร์ (Rubric Scoring)
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                  {rubrics.length} เกณฑ์
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="px-2.5 py-1 text-xs bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 font-bold rounded-lg flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มเกณฑ์รูบิก</span>
              </button>
            </div>

            {/* Rubric Criteria List with Editable Fields */}
            <div className="space-y-2">
              {rubrics.map((criterion, idx) => {
                const currentScoreObj = rubricScores.find((rs) => rs.criterionId === criterion.id || rs.title === criterion.title);
                const currentCriterionScore = currentScoreObj ? currentScoreObj.score : 0;

                return (
                  <div
                    key={criterion.id || idx}
                    className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={criterion.title}
                          onChange={(e) => handleUpdateCriterion(criterion.id, { title: e.target.value })}
                          placeholder="ชื่อเกณฑ์ เช่น ความถูกต้อง"
                          className="flex-1 px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500 text-[11px]">คะแนนเต็ม:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={criterion.maxScore}
                            onChange={(e) => handleUpdateCriterion(criterion.id, { maxScore: Number(e.target.value) || 1 })}
                            className="w-14 px-1.5 py-1 text-xs font-bold text-center text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
                          />
                        </div>

                        {rubrics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(criterion.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                            title="ลบเกณฑ์นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Score Slider / Setter for this Rubric */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] font-bold text-indigo-900 shrink-0">
                          ให้คะแนนเกณฑ์นี้:
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={criterion.maxScore}
                          step="0.5"
                          value={currentCriterionScore}
                          onChange={(e) =>
                            handleRubricScoreChange(
                              criterion.id,
                              criterion.title,
                              criterion.maxScore,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-xs font-bold text-indigo-700 shrink-0 min-w-14 text-right">
                          {currentCriterionScore} / {criterion.maxScore}
                        </span>
                      </div>

                      {currentScoreObj?.comment && (
                        <div className="text-[11px] text-slate-500 italic sm:max-w-[40%] truncate">
                          AI: {currentScoreObj.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Trigger Box */}
          <div className="p-4 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs text-indigo-950">
                    ตรวจประเมินด้วย AI ตามเกณฑ์รูบิกที่กำหนด
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  AI จะอ่านทั้งคำตอบและวิเคราะห์ไฟล์แนบ (Multimodal) แล้วให้คะแนนแยกตามเกณฑ์รูบิกที่คุณครูตั้งไว้
                </p>
              </div>

              <button
                type="button"
                id="btn-run-ai-eval"
                onClick={handleRunAiEvaluation}
                disabled={isAiLoading}
                className="px-4 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI กำลังประเมินตามเกณฑ์...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>วิเคราะห์ด้วย AI ทันที</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {aiError}
              </div>
            )}

            {/* AI Results breakdown */}
            {aiResult && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-indigo-100 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">ผลการวิเคราะห์โดย Gemini AI</span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                    คะแนนรวมที่แนะนำ: {aiResult.suggestedScore} / {assignment.maxScore}
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 mb-1">ความเห็นสังเคราะห์:</div>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {aiResult.feedback}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                    <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>จุดแข็งที่ทำได้ดี:</span>
                    </div>
                    <ul className="list-disc list-inside text-emerald-900 space-y-0.5 text-[11px]">
                      {aiResult.strengths?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <div className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>จุดที่ควรพัฒนา:</span>
                    </div>
                    <ul className="list-disc list-inside text-amber-900 space-y-0.5 text-[11px]">
                      {aiResult.weaknesses?.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg">
                  <div className="font-bold text-purple-900 flex items-center gap-1 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-700" />
                    <span>คำแนะนำในการปรับปรุงการสอนให้ตรงจุดอ่อน (Personalized):</span>
                  </div>
                  <p className="text-purple-950 text-[11px] leading-relaxed">
                    {aiResult.recommendedImprovement}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Teacher Grade & Feedback Inputs */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  คะแนนรวมสุทธิ (เต็ม {assignment.maxScore} คะแนน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={assignment.maxScore}
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">คะแนน</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  แต้มสะสมรางวัล (Points Reward)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={pointsToAward}
                    onChange={(e) => setPointsToAward(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-amber-700 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> แต้ม
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ข้อเสนอแนะและคำติชมจากครูผู้สอน (ส่งให้นักเรียนเห็น)
              </label>
              <textarea
                rows={3}
                value={teacherFeedback}
                onChange={(e) => setTeacherFeedback(e.target.value)}
                placeholder="เขียนข้อคิดเห็น ให้กำลังใจ หรือข้อแนะนำเพิ่มเติม..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            id="btn-confirm-grade"
            onClick={handleSaveGrade}
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึกคะแนน...' : 'บันทึกคะแนนและมอบแต้ม'}</span>
          </button>
        </div>
      </div>

      {/* Universal File Viewer Modal */}
      <UniversalFileViewerModal
        isOpen={Boolean(viewingFile)}
        onClose={() => setViewingFile(null)}
        file={viewingFile}
      />
    </div>
  );
};

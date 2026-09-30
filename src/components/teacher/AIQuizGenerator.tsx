import React, { useState } from 'react';
import type { Classroom, Quiz, QuizQuestion } from '../../types';
import { saveQuiz, deleteQuiz } from '../../services/firestoreService';
import { generateQuizWithAI } from '../../services/aiService';
import {
  BrainCircuit,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  PlusCircle,
  HelpCircle,
  Edit3,
  Loader2,
  Award,
  Layers,
  Trash2,
} from 'lucide-react';

interface AIQuizGeneratorProps {
  classroom: Classroom | null;
  quizzes: Quiz[];
}

export const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  classroom,
  quizzes,
}) => {
  const [topic, setTopic] = useState('เทคโนโลยีชีวภาพและพันธุวิศวกรรม');
  const [gradeLevel, setGradeLevel] = useState('มัธยมศึกษาปีที่ 3');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('ปานกลาง');
  const [lessonContent, setLessonContent] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    title: string;
    topic: string;
    questions: QuizQuestion[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);

  const handleDeleteExistingQuiz = async (quizId: string) => {
    try {
      setDeletingQuizId(quizId);
      await deleteQuiz(quizId);
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      setError(err?.message || 'เกิดข้อผิดพลาดในการลบแบบทดสอบ');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateQuizWithAI({
        topic: topic.trim(),
        gradeLevel,
        numQuestions: Number(numQuestions),
        difficulty,
        lessonContent: lessonContent.trim() || undefined,
      });
      setGeneratedQuiz(data);
    } catch (err: any) {
      console.warn('AI Quiz generation notice:', err);
      setError('ไม่สามารถสร้างแบบทดสอบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!generatedQuiz || generatedQuiz.questions.length === 0 || !classroom) return;

    setIsSaving(true);
    try {
      const quiz: Quiz = {
        id: `quiz_${Date.now()}`,
        classroomId: classroom.id,
        title: generatedQuiz.title || `แบบทดสอบ: ${topic}`,
        topic: generatedQuiz.topic || topic,
        questions: generatedQuiz.questions,
        timeLimitMinutes: Number(timeLimitMinutes) || 15,
        maxScore: generatedQuiz.questions.length * 2, // 2 points per question
        createdAt: new Date().toISOString(),
      };

      await saveQuiz(quiz);
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
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
          <BrainCircuit className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับสร้างแบบทดสอบ</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาสร้างหรือเลือกห้องเรียน เพื่อเริ่มใช้ AI ออกข้อสอบและสร้างคลังแบบทดสอบ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-linear-to-r from-purple-700 via-indigo-700 to-blue-600 rounded-3xl text-white shadow-xl shadow-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI นวัตกรรมผู้ช่วยครู</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ระบบ AI ออกข้อสอบอัตโนมัติ</h1>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
            สร้างแบบทดสอบมาตรฐาน 4 ตัวเลือก พร้อมเฉลยและคำอธิบายภาษาไทย ช่วยลดภาระเตรียมสอนอย่างมีประสิทธิภาพ
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs text-indigo-200">แบบทดสอบในห้องเรียน</span>
          <div className="text-2xl font-extrabold text-white">{quizzes.length} ชุด</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Prompt Parameters Form */}
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-600" />
              <span>ตั้งค่าโจทย์และเนื้อหาข้อสอบ</span>
            </h2>

            <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  หัวข้อ / สาระการเรียนรู้ *
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="เช่น พันธุศาสตร์ CRISPR, กฎของเมนเดล..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ระดับชั้น
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ประถมศึกษาตอนปลาย">ประถมปลาย (ป.4-6)</option>
                    <option value="มัธยมศึกษาปีที่ 1">มัธยมศึกษาปีที่ 1</option>
                    <option value="มัธยมศึกษาปีที่ 2">มัธยมศึกษาปีที่ 2</option>
                    <option value="มัธยมศึกษาปีที่ 3">มัธยมศึกษาปีที่ 3</option>
                    <option value="มัธยมศึกษาตอนปลาย">มัธยมปลาย (ม.4-6)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    จำนวนข้อสอบ
                  </label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={3}>3 ข้อ (แบบทดสอบเร็ว)</option>
                    <option value={5}>5 ข้อ (มาตรฐาน)</option>
                    <option value={10}>10 ข้อ (เก็บคะแนนย่อย)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ระดับความยาก
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ง่าย">ง่าย (วัดความจำ)</option>
                    <option value="ปานกลาง">ปานกลาง (วัดความเข้าใจ)</option>
                    <option value="ยาก/คิดวิเคราะห์">ท้าทาย (คิดวิเคราะห์)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    เวลาทำข้อสอบ (นาที)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ข้อความบทเรียนอ้างอิง (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="สามารถวางย่อหน้าบทเรียนเพื่อให้ AI ออกข้อสอบตรงตามชีทสอน..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                id="btn-generate-ai-quiz"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini AI กำลังออกแบบข้อสอบ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>สร้างข้อสอบด้วย AI</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Quizzes in Classroom */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>แบบทดสอบที่มีในห้องเรียน ({quizzes.length})</span>
            </h3>

            {quizzes.length === 0 ? (
              <p className="text-xs text-slate-400">ยังไม่มีแบบทดสอบในห้องนี้</p>
            ) : (
              <div className="space-y-2">
                {quizzes.map((q) => (
                  <div key={q.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800">{q.title}</div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingQuiz(q.id)}
                        disabled={deletingQuizId === q.id}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 disabled:opacity-50"
                        title="ลบแบบทดสอบนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>{q.questions.length} ข้อ ({q.timeLimitMinutes} นาที)</span>
                      <span className="text-purple-600 font-semibold">คะแนนเต็ม {q.maxScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Generated Quiz Review & Publish */}
        <div className="lg:col-span-2 space-y-4">
          {generatedQuiz ? (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="p-5 bg-linear-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-800">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>ข้อสอบสร้างสำเร็จโดย AI พร้อมนำไปใช้งาน</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{generatedQuiz.title}</h2>
                  <p className="text-xs text-slate-500">
                    หัวข้อ: {generatedQuiz.topic} | {generatedQuiz.questions.length} ข้อ | เวลา {timeLimitMinutes} นาที
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-publish-quiz"
                  onClick={handlePublishQuiz}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSaving ? 'กำลังเผยแพร่...' : saveSuccess ? 'เผยแพร่เรียบร้อย!' : 'เผยแพร่สู่ห้องเรียน'}</span>
                </button>
              </div>

              {/* Questions List with Choices and Explanations */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {generatedQuiz.questions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-xs">
                        ข้อที่ {qIndex + 1}
                      </span>
                      <p className="font-semibold text-xs text-slate-900 leading-relaxed grow">
                        {q.question}
                      </p>
                    </div>

                    {/* Choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      {q.options.map((opt, optIndex) => {
                        const isCorrect = optIndex === q.answerIndex;
                        return (
                          <div
                            key={optIndex}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className="grow">{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/70 text-xs text-purple-950">
                        <span className="font-bold flex items-center gap-1 text-purple-800 mb-0.5">
                          <HelpCircle className="w-3.5 h-3.5" /> คำอธิบายและเฉลย:
                        </span>
                        <p className="text-[11px] leading-relaxed text-purple-900">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <BrainCircuit className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="font-bold text-slate-800 text-sm">ยังไม่ได้สร้างชุดข้อสอบ</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ระบุหัวข้อบทเรียนและคลิก "สร้างข้อสอบด้วย AI" ทางซ้ายมือ เพื่อให้ระบบ Gemini ช่วยสร้างข้อสอบคุณภาพสูงพร้อมเฉลยอย่างละเอียด
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

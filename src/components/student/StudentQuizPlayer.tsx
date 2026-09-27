import React, { useState, useEffect } from 'react';
import type { Classroom, Quiz, QuizResult, UserProfile } from '../../types';
import { submitQuizResult } from '../../services/firestoreService';
import confetti from 'canvas-confetti';
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface StudentQuizPlayerProps {
  classroom: Classroom | null;
  quizzes: Quiz[];
  student: UserProfile;
}

export const StudentQuizPlayer: React.FC<StudentQuizPlayerProps> = ({
  classroom,
  quizzes,
  student,
}) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    points: number;
  } | null>(null);

  useEffect(() => {
    let timer: any;
    if (activeQuiz && !isCompleted && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeQuiz, isCompleted, secondsRemaining]);

  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSecondsRemaining((quiz.timeLimitMinutes || 15) * 60);
    setIsCompleted(false);
    setResult(null);
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !classroom) return;

    let score = 0;
    const answersArr: number[] = [];

    activeQuiz.questions.forEach((q, idx) => {
      const ans = selectedAnswers[idx] ?? -1;
      answersArr.push(ans);
      if (ans === q.answerIndex) {
        score += 2; // 2 points per correct answer
      }
    });

    const total = activeQuiz.questions.length * 2;
    const points = score * 5; // e.g. 10 score = 50 pts

    const quizRes: QuizResult = {
      id: `qres_${Date.now()}`,
      quizId: activeQuiz.id,
      classroomId: classroom.id,
      studentId: student.id,
      studentName: student.name,
      score,
      totalScore: total,
      answers: answersArr,
      completedAt: new Date().toISOString(),
      pointsEarned: points,
    };

    await submitQuizResult(quizRes);
    setResult({ score, total, points });
    setIsCompleted(true);

    if (score > 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
          <BrainCircuit className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">คุณยังไม่ได้เข้าร่วมห้องเรียน</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาเข้าร่วมห้องเรียนด้วยรหัส 6 หลักจากคุณครูผู้สอนเพื่อเริ่มทำแบบทดสอบ
        </p>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ห้องสอบและแบบทดสอบวัดความรู้</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ทำแบบทดสอบเก็บคะแนนแบบจับเวลา ประเมินผลอัตโนมัติพร้อมคำอธิบายเฉลย
          </p>
        </div>
      </div>

      {!activeQuiz ? (
        /* Quiz Selection List */
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            แบบทดสอบที่พร้อมให้ทำ ({quizzes.length} ชุด)
          </h2>

          {quizzes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">ยังไม่มีแบบทดสอบในห้องนี้</h3>
              <p className="text-xs text-slate-500">รอคุณครูเผยแพร่แบบทดสอบใหม่</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                      {q.topic}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{q.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        เวลา {q.timeLimitMinutes} นาที
                      </span>
                      <span>{q.questions.length} ข้อ ({q.maxScore} คะแนน)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartQuiz(q)}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>เริ่มทำแบบทดสอบ</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !isCompleted ? (
        /* Active Quiz Question Interface */
        <div className="bg-white rounded-3xl border border-purple-200 shadow-lg overflow-hidden space-y-4">
          {/* Quiz Top bar with timer */}
          <div className="p-4 sm:p-5 bg-linear-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
            <div>
              <span className="text-xs text-purple-200 font-semibold">{activeQuiz.title}</span>
              <div className="text-sm font-bold">
                ข้อที่ {currentIndex + 1} จาก {activeQuiz.questions.length} ข้อ
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-xs font-mono font-bold">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>

          {/* Question & Choices */}
          {activeQuiz.questions[currentIndex] && (
            <div className="p-6 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-xs mb-2 inline-block">
                  คำถามข้อที่ {currentIndex + 1}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                  {activeQuiz.questions[currentIndex].question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {activeQuiz.questions[currentIndex].options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ข้อย้อนหลัง</span>
                </button>

                {currentIndex < activeQuiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((p) => p + 1)}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                  >
                    <span>ข้อถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-finish-quiz"
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ส่งข้อสอบ</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Completed & Review Interface */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-6">
          <div className="p-8 bg-linear-to-b from-purple-50 to-white text-center space-y-3 border-b border-slate-100">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-linear-to-tr from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
              <Award className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">ทำแบบทดสอบเสร็จสมบูรณ์!</h2>
            <p className="text-xs text-slate-500">ผลการประเมินความรู้ของคุณในหัวข้อ: {activeQuiz.topic}</p>

            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl min-w-[120px]">
                <span className="text-[11px] font-semibold text-purple-700">คะแนนที่ได้</span>
                <div className="text-2xl font-extrabold text-purple-950 mt-0.5">
                  {result?.score} / {result?.total}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl min-w-[120px]">
                <span className="text-[11px] font-semibold text-amber-700">แต้มสะสมที่ได้รับ</span>
                <div className="text-2xl font-extrabold text-amber-800 mt-0.5 flex items-center justify-center gap-1">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>+{result?.points}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Question Review with Explanations */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              เฉลยและคำอธิบายละเอียด
            </h3>

            {activeQuiz.questions.map((q, idx) => {
              const studentAns = selectedAnswers[idx];
              const isCorrect = studentAns === q.answerIndex;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                    isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-bold text-slate-900 leading-snug">
                      ข้อ {idx + 1}: {q.question}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                    {q.options.map((opt, optIdx) => {
                      const isOptionCorrect = optIdx === q.answerIndex;
                      const isOptionChosen = optIdx === studentAns;

                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                            isOptionCorrect
                              ? 'bg-emerald-100 border-emerald-300 font-bold text-emerald-950'
                              : isOptionChosen
                              ? 'bg-rose-100 border-rose-300 font-bold text-rose-950 line-through'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-950 text-[11px] flex items-start gap-1.5 ml-6">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveQuiz(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>กลับสู่รายการข้อสอบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

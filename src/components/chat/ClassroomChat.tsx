import React, { useState, useEffect, useRef } from 'react';
import type { Classroom, ChatMessage, UserProfile } from '../../types';
import { subscribeToMessages, sendChatMessage } from '../../services/firestoreService';
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  User,
  Megaphone,
  HelpCircle,
  Clock,
} from 'lucide-react';

interface ClassroomChatProps {
  classroom: Classroom | null;
  currentUser: UserProfile;
}

export const ClassroomChat: React.FC<ClassroomChatProps> = ({
  classroom,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<'all' | 'announcements' | 'qa'>('all');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!classroom?.id) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(classroom.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [classroom?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !classroom?.id) return;

    setIsSending(true);
    try {
      const msg: ChatMessage = {
        id: `msg_${Date.now()}`,
        classroomId: classroom.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatar,
        receiverId: 'all',
        text: text.trim(),
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      await sendChatMessage(msg);
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (!classroom) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 sm:p-14 text-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">ยังไม่มีห้องเรียนสำหรับเปิดแชท</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {currentUser.role === 'teacher'
            ? 'กรุณาสร้างห้องเรียน หรือเลือกห้องเรียนที่มีอยู่เพื่อเริ่มการสื่อสารและตอบคำถามนักเรียน'
            : 'กรุณาเข้าร่วมห้องเรียนด้วยรหัส 6 หลักเพื่อเริ่มพูดคุยกับคุณครูและเพื่อนร่วมชั้น'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[75vh]">
      {/* Chat Header */}
      <div className="p-4 bg-linear-to-r from-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base">พื้นที่สนทนาและกระดานถาม-ตอบเรียลไทม์</h2>
            <p className="text-xs text-indigo-100">ห้องเรียน: {classroom.name} ({classroom.code})</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-teal-100">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ถ่ายทอดสดแบบเรียลไทม์</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-xs">ยังไม่มีข้อความสนทนาในห้องเรียนนี้</h3>
            <p className="text-xs text-slate-400">เริ่มต้นพิมพ์คำถามหรือพูดคุยกับคุณครูและเพื่อนๆ ได้ทันที</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const isTeacher = m.senderRole === 'teacher';

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 text-xs font-bold ${
                    isTeacher ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>

                <div className={`space-y-1 ${isMe ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">{m.senderName}</span>
                    {isTeacher && (
                      <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-md font-bold text-[9px] flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> ครูผู้สอน
                      </span>
                    )}
                    <span>• {new Date(m.timestamp || (m as any).createdAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed inline-block max-w-md ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-tr-xs text-left shadow-xs'
                        : isTeacher
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-tl-xs shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {m.text || m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            id="chat-input-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              currentUser.role === 'teacher'
                ? 'พิมพ์ข้อความหรือประกาศถึงนักเรียนทุกคนในห้อง...'
                : 'ถามคำถามเรื่องการบ้าน หรือปรึกษาคุณครู...'
            }
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
          <button
            type="submit"
            id="btn-send-chat"
            disabled={isSending || !text.trim()}
            className="p-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs font-bold shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">ส่งข้อความ</span>
          </button>
        </form>
      </div>
    </div>
  );
};

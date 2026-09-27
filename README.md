# โรงเรียนไทยนิยมสงเคราะห์ - ระบบจัดการเรียนรู้อัจฉริยะ (Smart LMS)
### Thai Niyom Songkhrao School - Cloud Innovation Platform

ระบบจัดการเรียนรู้และห้องเรียนดิจิทัลออนไลน์ โรงเรียนไทยนิยมสงเคราะห์ (สังกัดสำนักงานเขตบางเขน กรุงเทพมหานคร) พัฒนาด้วย React 19, TypeScript, Tailwind CSS, Google Gemini AI และ Cloud Firestore ทำงานแบบเรียลไทม์ 100%

---

## 🚀 ฟีเจอร์หลักของระบบ (Key Features)

1. **ระบบคลาวด์เรียลไทม์ (Real-time Cloud Firestore)**
   - จัดการห้องเรียน, บทเรียน, การบ้าน, และข้อสอบ ซิงค์ข้อมูลสดทันทีระหว่างครูและนักเรียน
   - เช็คชื่อเข้าเรียน (Attendance) พร้อมคิดเปอร์เซ็นต์แบบเรียลไทม์
   - บันทึกพฤติกรรมผู้เรียน (Behavior Scoring) ระบบดาวและความดี
   - แชทห้องเรียนออนไลน์สื่อสารโต้ตอบทันที
   - สะสมแต้มและออกเกียรติบัตรอิเล็กทรอนิกส์ (E-Certificates) อัตโนมัติ

2. **ระบบปัญญาประดิษฐ์ AI (Google Gemini AI Engine)**
   - **AI ช่วยออกข้อสอบ (AI Quiz Generator)**: ป้อนหัวข้อและระดับชั้นเพื่อสร้างแบบทดสอบ 4 ตัวเลือกพร้อมเฉลยและคำอธิบายละเอียด
   - **AI ตรวจการบ้าน (AI Rubric Grader)**: ตรวจประเมินผลงานนักเรียนตามเกณฑ์รูบิก ให้ข้อเสนอแนะเชิงกัลยาณมิตร
   - **AI วิเคราะห์ทักษะนักเรียน (AI Skill Radar)**: วิเคราะห์สมรรถนะ 5 ด้าน พร้อมคำแนะนำสำหรับจัดการเรียนรู้เฉพาะบุคคล
   - **เสถียรภาพ 100%**: ทำงานได้ทั้งแบบ Full-stack Node API Proxy และแบบ Static Client-side Fallback

3. **การเข้าสู่ระบบ (Authentication & Identity)**
   - เข้าสู่ระบบด้วยบัญชี Google (Google OAuth Popup & Redirect)
   - เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน หรือรหัสนักเรียน
   - สมัครสมาชิกใหม่ระบุบทบาทครูหรือนักเรียน พร้อมกำหนดห้องเรียนและวิชาสอน

---

## 🌐 การเผยแพร่ขึ้น GitHub (Publish to GitHub)

### 1. วิธีเผยแพร่บน GitHub Pages (โฮสติ้งฟรีโดยตรงจาก GitHub)
โปรเจกต์นี้มีไฟล์ `.github/workflows/deploy.yml` พร้อมใช้งาน:
1. อัปโหลดโค้ดขึ้น GitHub Repository ของคุณ (`git push origin main`)
2. ไปที่ **Settings** ของ Repository บน GitHub > ไปที่เมนู **Pages**
3. ภายใต้ **Build and deployment > Source** เลือก **GitHub Actions**
4. ระบบจะทำการ Build และ Deploy เว็บไซต์ให้ทันทีโดยอัตโนมัติ!

### 2. การตั้งค่า Google Sign-In สำหรับโดเมน GitHub
เมื่อนำขึ้น GitHub Pages (เช่น `https://<username>.github.io` หรือโดเมนของคุณ):
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจกต์ของคุณ > เมนู **Authentication**
3. คลิกแท็บ **Settings** > เลือก **Authorized domains**
4. คลิกปุ่ม **Add domain** แล้วพิมพ์ชื่อโดเมนของคุณ (เช่น `<username>.github.io`)
5. กด **Save** เพียงเท่านี้ปุ่ม **เข้าสู่ระบบด้วย Google** จะใช้งานได้ 100%
> *หมายเหตุ: หากยังไม่ได้เพิ่มโดเมน ผู้ใช้งานยังคงสามารถเข้าสู่ระบบด้วยชื่อและอีเมล Google หรือเข้าสู่ระบบด้วยอีเมล/รหัสผ่านโรงเรียนได้ทันทีโดยไม่ติดขัด*

### 3. การตั้งค่า Gemini AI เมื่อเผยแพร่บน GitHub
ระบบรองรับทั้ง 2 รูปแบบ:
- **บน GitHub Pages (Static Hosting)**: ไปที่ GitHub Repository > **Settings** > **Secrets and variables** > **Actions** > สร้าง Secret ชื่อ `VITE_GEMINI_API_KEY` (ใส่คีย์ที่ได้จาก Google AI Studio)
- **บนเซิร์ฟเวอร์ Full-stack (Render / Railway / Vercel / VPS)**: ตั้งค่าตัวแปร `GEMINI_API_KEY` ใน Environment Variables
- *หากไม่ระบุ API Key ระบบมีชุดประมวลผลการศึกษาอัจฉริยะ (Pedagogical Engine) รองรับอัตโนมัติ ระบบจะไม่ขัดข้องหรือแสดงข้อผิดพลาดอย่างแน่นอน*

---

## 💻 การติดตั้งและรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้นรันเซิร์ฟเวอร์สำหรับทดสอบ
npm run dev

# 3. ทดสอบการ Build สำหรับ Production
npm run build

# 4. รันระบบ Production Server
npm start
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── .github/workflows/deploy.yml  # GitHub Actions สำหรับ Build & Deploy อัตโนมัติ
├── api/                          # Serverless Handler สำหรับ Vercel/คลาวด์
├── server/                       # Node Express Backend & Gemini AI Service
│   ├── apiRouter.ts              # API Route จัดการไฟล์และคำขอ AI
│   └── geminiService.ts          # Server-side Gemini AI Integration
├── src/
│   ├── components/               # ส่วนติดต่อผู้ใช้งาน (UI Components)
│   │   ├── auth/                 # หน้าจอเข้าสู่ระบบโรงเรียนไทยนิยมสงเคราะห์
│   │   ├── teacher/              # แผงควบคุมครู, ออกข้อสอบ AI, ตรวจการบ้าน
│   │   ├── student/              # แผงควบคุมนักเรียน, ทำข้อสอบ, ส่งงาน, รับเกียรติบัตร
│   │   └── chat/                 # ห้องสนทนาเรียลไทม์
│   ├── context/                  # Context State (Auth, Real-time)
│   ├── services/
│   │   ├── aiService.ts          # Unified Client/Server AI Service
│   │   └── firestoreService.ts   # Real-time Cloud Firestore Service
│   └── lib/
│       ├── firebase.ts           # Firebase App & Auth Configuration
│       └── fileUpload.ts         # Universal File Upload & Compression
├── firestore.rules               # กฎความปลอดภัย Cloud Firestore
├── firebase-applet-config.json   # ค่าคอนฟิกูเรชัน Firebase
└── vite.config.ts                # Vite Configuration (Relative Base Support)
```

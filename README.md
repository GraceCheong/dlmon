# 🎨 Letto Teacher Studio (KeYi Studio)

**KeYi Studio (可意工作室)** is a specialized **Chinese Teaching Management System (CTMS)** designed to bridge the gap between traditional language instruction and modern AI-driven learning. It empowers teachers to create high-quality, AI-analyzed Chinese content and provides students with an interactive workspace for immediate, automated feedback.

---

## 🚀 Quick Start

### 1. Initial Setup
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Database Configuration
This project uses **SQLite** with **Prisma**. Run migrations and seed the initial testing data:
```bash
npx prisma db push
node scratch/seed_test_data.js
```

### 3. AI Setup (Local LLM)
To enable AI Grading and Syllabus generation, ensure you have a local OpenAI-compatible endpoint running (e.g., **Ollama** or **LM Studio**).
*   **Default Endpoint:** `http://localhost:11434/v1`
*   **Default Model:** `llama3` or `qwen2-7b`
*   *Note: Configuration can be modified in `.env`.*

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run Production Server (Port 8080)
Build and start the production server:
```bash
# bash / macOS / Linux
npm run build
PORT=8080 npm run start
```
```powershell
# PowerShell (Windows)
npm run build
$env:PORT=8080; npm run start
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🔑 Testing Credentials
Use the following account to access the Teacher Dashboard:
*   **Email:** `test@example.com`
*   **Password:** `password`

---

## ✨ Key Features

### 👨‍🏫 Teacher Dashboard
*   **AI Curriculum Generator:** Create full 8-week syllabi with one click using localized LLMs.
*   **Assignment Manager:** Deploy writing and speaking tasks with specific linguistic prompts.
*   **Linguistic Analyzer:** Automatic Pinyin (Ruby tags) generation and HSK level difficulty analysis for any Chinese text.

### 🎓 Student Workspace
*   **Distraction-Free Mode:** A focused portal for students to submit assignments without sidebar clutter.
*   **Instant AI Feedback:** Immediate scoring (0-100) and detailed linguistic suggestions powered by the Vercel AI SDK.
*   **Magic Links:** Direct access to assignments via unique URLs, reducing onboarding friction.

---

## 🛠️ Technology Stack
*   **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
*   **Database:** [Prisma ORM](https://www.prisma.io/) with SQLite
*   **AI Orchestration:** [Vercel AI SDK](https://sdk.vercel.ai/)
*   **Styling:** Vanilla CSS & Tailwind CSS
*   **Authentication:** [NextAuth.js](https://next-auth.js.org/)
*   **Icons:** [Lucide React](https://lucide.dev/)

---

## 📄 Documentation
For detailed UX strategies and interaction patterns, please refer to:
*   [UX Strategy & UI Scenarios](./ux_strategy_scenarios.md)
*   [Final UI Verification Report](./ui_scenario_report.md)

---

## 🤝 Contributing
This project is built with a focus on **UX excellence** and **Local-First AI privacy**. For major changes, please open an issue first to discuss what you would like to change.

---

**Developed with ❤️ by the KeYi Studio Team.**

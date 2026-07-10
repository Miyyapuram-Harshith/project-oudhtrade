import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'mongodb.json');

const defaultDb = {
  cites_evaluations: [],
  verification_documents: [],
  chat_history: [],
  logs: [],
  analytics: [],
  ai_reports: [],
  speech_transcripts: [],
  emotion_timelines: []
};

class DocumentDatabase {
  constructor() {
    this.data = { ...defaultDb };
    this.load();
  }

  load() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);
        // Merge with defaultDb to ensure all fields exist
        this.data = { ...defaultDb, ...parsed };
      } else {
        this.data = { ...defaultDb };
        this.save();
      }
      this.seed();
      this.save();
    } catch (error) {
      console.error("Failed to load MongoDB simulation database:", error);
      this.data = { ...defaultDb };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error("Failed to save MongoDB simulation database:", error);
    }
  }

  seed() {
    // Seed AI report documents if empty
    if (!this.data.ai_reports || this.data.ai_reports.length === 0) {
      this.data.ai_reports = [{
        id: "mongo-report-stripe-101",
        application_id: "app-1",
        candidate_id: "candidate-uuid-stripe-001",
        summary: "Alex Rivera exhibits strong technical skills in React.js and CSS layouts. Their performance during the cognitive test was outstanding (92%), showcasing high problem-solving capability. Speech clarity is high, although emotion tracking indicates slight anxiety in the middle portion of the interview.",
        strengths: [
          "Exceptional React state management explanation",
          "High logical reasoning and cognitive scores",
          "Fluent and clear verbal communication"
        ],
        weaknesses: [
          "Needs improvement in eye contact focus consistency",
          "Slightly fast speaking pace during technical coding questions"
        ],
        created_at: new Date().toISOString()
      }];

      this.data.speech_transcripts = [{
        id: "transcript-stripe-101",
        report_id: "mongo-report-stripe-101",
        application_id: "app-1",
        transcripts: [
          {
            questionId: "q1",
            question: "Describe your experience with CSS grid and responsive layouts.",
            content: "I have been using CSS grid and flexbox for over four years to build highly responsive, mobile-first dashboards. I focus on reducing layout reflow and achieving perfect WCAG contrast guidelines."
          },
          {
            questionId: "q2",
            question: "How do you handle performance bottlenecks in React?",
            content: "I profile components using React DevTools to avoid unnecessary re-renders. I make use of useMemo and useCallback where appropriate, and optimize asset loading using modern build configurations."
          }
        ],
        created_at: new Date().toISOString()
      }];

      this.data.emotion_timelines = [{
        id: "timeline-stripe-101",
        report_id: "mongo-report-stripe-101",
        application_id: "app-1",
        timeline: [
          { time: "0s", emotion: "neutral", eye_contact: 0.95, confidence: 0.85 },
          { time: "10s", emotion: "happy", eye_contact: 0.90, confidence: 0.90 },
          { time: "20s", emotion: "neutral", eye_contact: 0.85, confidence: 0.80 },
          { time: "30s", emotion: "anxious", eye_contact: 0.70, confidence: 0.72 },
          { time: "40s", emotion: "neutral", eye_contact: 0.88, confidence: 0.88 },
          { time: "50s", emotion: "happy", eye_contact: 0.95, confidence: 0.92 }
        ],
        created_at: new Date().toISOString()
      }];
    }
  }

  get cites_evaluations() { return this.data.cites_evaluations; }
  get verification_documents() { return this.data.verification_documents; }
  get chat_history() { return this.data.chat_history; }
  get logs() { return this.data.logs; }
  get analytics() { return this.data.analytics; }
  get ai_reports() { return this.data.ai_reports; }
  get speech_transcripts() { return this.data.speech_transcripts; }
  get emotion_timelines() { return this.data.emotion_timelines; }
}

const mongoDb = new DocumentDatabase();
export default mongoDb;

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
  analytics: []
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
        // Merge with defaultDb to ensure all OudhTrade fields exist
        this.data = { ...defaultDb, ...parsed };
      } else {
        this.data = { ...defaultDb };
        this.save();
      }
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

  get cites_evaluations() { return this.data.cites_evaluations; }
  get verification_documents() { return this.data.verification_documents; }
  get chat_history() { return this.data.chat_history; }
  get logs() { return this.data.logs; }
  get analytics() { return this.data.analytics; }
}

const mongoDb = new DocumentDatabase();
export default mongoDb;

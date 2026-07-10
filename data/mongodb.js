import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'mongodb.json');

/**
 * OudhTrade MongoDB Simulation
 * 
 * Stores unstructured/document-type data that would naturally be stored
 * in a MongoDB collection in a production environment:
 * - CITES compliance evaluation reports (AI engine outputs)
 * - Verification document uploads (scanned IDs, plantation certificates)
 * - User activity and analytics snapshots
 * - Full-text chat history archives
 * - Audit event logs for regulatory compliance
 */
const defaultDb = {
  cites_evaluations: [],       // AI CITES compliance scan results per listing
  verification_documents: [],  // Uploaded identity & plantation proof documents
  chat_history: [],            // Archived messaging thread logs
  audit_events: [],            // Full regulatory audit event log
  analytics_snapshots: []      // Platform usage analytics
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
      console.error('Failed to load OudhTrade document database:', error);
      this.data = { ...defaultDb };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save OudhTrade document database:', error);
    }
  }

  get cites_evaluations() { return this.data.cites_evaluations; }
  get verification_documents() { return this.data.verification_documents; }
  get chat_history() { return this.data.chat_history; }
  get audit_events() { return this.data.audit_events; }
  get analytics_snapshots() { return this.data.analytics_snapshots; }

  // Pushes that need to be accessible
  push(collection, item) {
    if (!this.data[collection]) this.data[collection] = [];
    this.data[collection].push(item);
  }
}

const mongoDb = new DocumentDatabase();
export default mongoDb;

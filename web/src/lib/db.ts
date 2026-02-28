import Dexie, { type Table } from 'dexie';

// User/session types
export interface UserSession {
  id?: number;
  telegramUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  authDate: Date;
  isAdmin?: boolean;
}

// Analysis history types
export interface AnalysisRecord {
  id?: number;
  telegramUserId?: string;
  analysis: string;
  transcript?: string;
  duration: number;
  createdAt: Date;
}

class RavonDb extends Dexie {
  sessions!: Table<UserSession, number>;
  analyses!: Table<AnalysisRecord, number>;

  constructor() {
    super('ravon_ai_indexed_db');

    this.version(1).stores({
      sessions: '++id, telegramUserId',
      analyses: '++id, telegramUserId, createdAt',
    });
  }
}

const db = new RavonDb();

// Session helpers
export async function saveSession(session: Omit<UserSession, 'id'>) {
  // Faqat bitta aktiv sessiya saqlaymiz
  await db.sessions.clear();
  await db.sessions.add(session);
}

export async function getSession(): Promise<UserSession | null> {
  const all = await db.sessions.toArray();
  return all[0] ?? null;
}

export async function clearSession() {
  await db.sessions.clear();
}

// Analysis helpers
export async function saveAnalysis(params: {
  analysis: string;
  transcript?: string;
  duration: number;
  createdAt: Date;
  telegramUserId?: string;
}) {
  const record: AnalysisRecord = {
    analysis: params.analysis,
    transcript: params.transcript,
    duration: params.duration,
    createdAt: params.createdAt,
    telegramUserId: params.telegramUserId,
  };

  await db.analyses.add(record);
}

export async function getAnalyses(telegramUserId?: string): Promise<AnalysisRecord[]> {
  const collection = telegramUserId
    ? db.analyses.where('telegramUserId').equals(telegramUserId)
    : db.analyses;

  const items = await collection.toArray();
  // Eng so'nggi tahlillar yuqorida bo'lishi uchun saralaymiz
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteAnalysis(id: number) {
  await db.analyses.delete(id);
}


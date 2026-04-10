import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatSession, ChatMessage, SessionIndexEntry, PluginData } from '../types';

export class SessionStore {
  private sessionsDir: string;
  private pluginData: PluginData;
  private persistIndex: () => Promise<void>;

  constructor(vaultPath: string, pluginData: PluginData, persistIndex: () => Promise<void>) {
    this.sessionsDir = path.join(vaultPath, '.obsidian-kb', 'sessions');
    this.pluginData = pluginData;
    this.persistIndex = persistIndex;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true });

    // Migrate legacy chatHistory if present
    if (this.pluginData.chatHistory.length > 0 && this.pluginData.sessionIndex.length === 0) {
      await this.migrateFromChatHistory(this.pluginData.chatHistory);
      this.pluginData.chatHistory = [];
      await this.persistIndex();
    }

    // Ensure at least one session exists
    if (this.pluginData.sessionIndex.length === 0) {
      const session = await this.createSession();
      this.pluginData.activeSessionId = session.id;
      await this.persistIndex();
    }
  }

  async createSession(): Promise<ChatSession> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const session: ChatSession = {
      id,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    await fs.writeFile(path.join(this.sessionsDir, id + '.json'), JSON.stringify(session, null, 2));

    this.pluginData.sessionIndex.unshift({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });

    this.pluginData.activeSessionId = id;
    await this.persistIndex();
    return session;
  }

  async loadSession(id: string): Promise<ChatSession> {
    try {
      const data = await fs.readFile(path.join(this.sessionsDir, id + '.json'), 'utf-8');
      return JSON.parse(data) as ChatSession;
    } catch (err) {
      console.error('KB: Failed to load session', id, err);
      // Remove stale index entry
      this.pluginData.sessionIndex = this.pluginData.sessionIndex.filter((e) => e.id !== id);
      await this.persistIndex();
      // Return a fresh session as fallback
      return this.createSession();
    }
  }

  async saveSession(session: ChatSession): Promise<void> {
    session.updatedAt = new Date().toISOString();

    const filePath = path.join(this.sessionsDir, session.id + '.json');
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(session, null, 2));
    await fs.rename(tmpPath, filePath);

    // Update index entry
    const entry = this.pluginData.sessionIndex.find((e) => e.id === session.id);
    if (entry) {
      entry.title = session.title;
      entry.updatedAt = session.updatedAt;
    }

    await this.persistIndex();
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.sessionsDir, id + '.json'));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('KB: Failed to delete session file', id, err);
      }
    }

    this.pluginData.sessionIndex = this.pluginData.sessionIndex.filter((e) => e.id !== id);

    if (this.pluginData.activeSessionId === id) {
      this.pluginData.activeSessionId =
        this.pluginData.sessionIndex.length > 0 ? this.pluginData.sessionIndex[0].id : null;
    }

    await this.persistIndex();
  }

  getSessionIndex(): SessionIndexEntry[] {
    return [...this.pluginData.sessionIndex]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 50);
  }

  getActiveSessionId(): string | null {
    return this.pluginData.activeSessionId;
  }

  setActiveSessionId(id: string): void {
    this.pluginData.activeSessionId = id;
    // Fire-and-forget persist; callers don't need to await this
    this.persistIndex().catch((err) =>
      console.error('KB: Failed to persist active session ID', err),
    );
  }

  async migrateFromChatHistory(messages: ChatMessage[]): Promise<ChatSession> {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    let title = 'Migrated Chat';
    if (firstUserMsg) {
      const cleanText = firstUserMsg.text.replace(/@\[\[[^\]]*\]\]\s*/g, '').trim();
      title = cleanText.slice(0, 30) || 'Migrated Chat';
    }

    const id = this.generateId();
    const now = new Date().toISOString();
    const session: ChatSession = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: [...messages],
    };

    await fs.writeFile(path.join(this.sessionsDir, id + '.json'), JSON.stringify(session, null, 2));

    this.pluginData.sessionIndex.unshift({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });

    this.pluginData.activeSessionId = id;
    return session;
  }

  private generateId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
  }
}

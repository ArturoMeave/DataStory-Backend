import fs from "fs";
import path from "path";
import type { DataSnapshot, UserAlertConfig } from "../types";

const DATA_DIR = path.resolve(__dirname, "../../data");
const SNAPSHOTS_FILE = path.join(DATA_DIR, "snapshots.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SNAPSHOTS_FILE)) {
    fs.writeFileSync(SNAPSHOTS_FILE, "[]", "utf-8");
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  }
}

function readJSON<T>(filePath: string): T[] {
  ensureStorage();
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T[];
  } catch {
    return [];
  }
}

function writeJSON<T>(filePath: string, data: T[]) {
  ensureStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function saveSnapshot(snapshot: DataSnapshot): void {
  const snapshots = readJSON<DataSnapshot>(SNAPSHOTS_FILE);
  const filtered = snapshots.filter((s) => s.userId !== snapshot.userId);
  filtered.push(snapshot);
  writeJSON(SNAPSHOTS_FILE, filtered);
}

export function getSnapshot(userId: string): DataSnapshot | null {
  const snapshots = readJSON<DataSnapshot>(SNAPSHOTS_FILE);
  return snapshots.find((s) => s.userId === userId) ?? null;
}

export function getAllSnapshots(): DataSnapshot[] {
  return readJSON<DataSnapshot>(SNAPSHOTS_FILE);
}

export function saveUserConfig(config: UserAlertConfig): void {
  const users = readJSON<UserAlertConfig>(USERS_FILE);
  const filtered = users.filter((u) => u.userId !== config.userId);
  filtered.push(config);
  writeJSON(USERS_FILE, filtered);
}

export function getUserConfig(userId: string): UserAlertConfig | null {
  const users = readJSON<UserAlertConfig>(USERS_FILE);
  return users.find((u) => u.userId === userId) ?? null;
}

export function getAllUserConfigs(): UserAlertConfig[] {
  return readJSON<UserAlertConfig>(USERS_FILE);
}

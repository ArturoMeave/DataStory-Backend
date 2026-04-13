// --- TIPOS DEL BACKEND (IA y Base de datos) ---
export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
}

export interface APIError {
  error: string;
}

export interface DataSnapshot {
  id: string;
  userId: string;
  createdAt: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  periodCount: number;
  goalAmount?: number;
  anomalyCount: number;
  aiSummary?: string;
  recentPeriods: Array<{
    date: string;
    revenue: number;
    expenses: number;
  }>;
}

export interface UserAlertConfig {
  userId: string;
  email: string;
  enableAnomalyAlerts: boolean;
  enableDailyDigest: boolean;
}

// --- TIPOS DEL FRONTEND (Que se colaron por accidente, pero los guardamos por si acaso) ---
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER" | "VIEWER";
  isTwoFactorEnabled?: boolean;
  twoFactorFrequency?: "always" | "7d" | "15d" | "30d";
  workspaceId?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export interface DataRow {
  date: string;
  revenue: number;
  expenses: number;
  [key: string]: any;
}

export interface Anomaly {
  index: number;
  type: "revenue" | "expenses";
  expected: number;
  actual: number;
  deviation: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

export interface ChartDataPoint extends DataRow {
  index: number;
  isForecast?: boolean;
}

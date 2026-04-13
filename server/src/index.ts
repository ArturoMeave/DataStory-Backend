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

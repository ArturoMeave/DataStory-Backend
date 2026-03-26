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
<<<<<<< HEAD

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
=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464

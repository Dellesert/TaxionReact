/**
 * Analytics API Service
 * API для получения аналитики и статистики (только для администраторов)
 */

import api from '../shared/api/axios.config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PeriodType = 'today' | 'week' | 'month' | 'year';

export interface StatValue {
  today: number;
  week: number;
  month: number;
  growth_percent?: number;
}

export interface TaskStats {
  created: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completion_rate: number;
}

export interface FileStats {
  total_files: number;
  total_size: number;
  avg_file_size: number;
  storage_used: number;
}

export interface DashboardStats {
  active_users: StatValue;
  messages: StatValue;
  tasks: TaskStats;
  calendar: StatValue;
  polls: StatValue;
  files: FileStats;
}

export interface EmployeePerformance {
  user_id: number;
  user_name: string;
  department_id?: number;
  department_name?: string;
  tasks_created: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  completion_rate: number;
  avg_completion_time: number;
  quality_score: number;
}

export interface DepartmentTaskStats {
  department_id: number;
  department_name: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_completion_time: number;
  employee_count: number;
}

export interface PriorityDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface DashboardResponse {
  period: string;
  stats: DashboardStats;
  charts?: {
    user_activity?: Array<{ date: string; value: number }>;
    messages_by_hour?: Array<{ date: string; value: number }>;
    tasks_by_status?: {
      new: number;
      in_progress: number;
      completed: number;
      overdue: number;
    };
  };
  tables?: {
    top_users?: any[];
    top_chats?: any[];
    top_performers?: EmployeePerformance[];
    department_activity?: DepartmentTaskStats[];
  };
}

export interface SuspiciousActivity {
  id: number;
  user_id?: number;
  email?: string;
  ip_address: string;
  activity_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  timestamp: string;
  created_at: string;
}

export interface SecurityDashboardData {
  login_stats: {
    total_attempts: number;
    successful: number;
    failed: number;
    success_rate: number;
  };
  top_failed_ips?: Array<{
    ip_address: string;
    count: number;
  }>;
  suspicious_activities?: SuspiciousActivity[];
  unresolved_activities_count?: number;
  active_sessions_count?: number;
  period: {
    start: string;
    end: string;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get main dashboard analytics
 */
export const getDashboardAnalytics = async (
  period: PeriodType = 'week',
  departmentId?: number
): Promise<DashboardResponse> => {
  try {
    const params: any = { period };
    if (departmentId) {
      params.department_id = departmentId;
    }

    const response = await api.get('/analytics/dashboard', { params });

    console.log('📊 Raw dashboard response:', response.data);

    // Handle different response formats
    const data = response.data;

    // If it's wrapped in a data property, unwrap it
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data as DashboardResponse;
    }

    // Return as is if it has the expected structure
    if (data && data.stats) {
      return data as DashboardResponse;
    }

    console.warn('Unexpected dashboard response format:', data);
    throw new Error('Invalid dashboard response format');
  } catch (error) {
    console.error('Failed to fetch dashboard analytics:', error);
    throw error;
  }
};

/**
 * Get task analytics
 */
export const getTaskStats = async (): Promise<any> => {
  try {
    const response = await api.get('/analytics/tasks/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch task stats:', error);
    throw error;
  }
};

/**
 * Get task priority distribution
 */
export const getTaskPriorityDistribution = async (
  period: PeriodType = 'week'
): Promise<PriorityDistribution> => {
  try {
    const response = await api.get<PriorityDistribution>(
      '/analytics/tasks/priority-distribution',
      { params: { period } }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch task priority distribution:', error);
    throw error;
  }
};

/**
 * Get top performing employees
 */
export const getTopPerformers = async (
  limit: number = 10,
  period?: PeriodType
): Promise<EmployeePerformance[]> => {
  try {
    const params: any = { limit };
    if (period) {
      params.period = period;
    }

    const response = await api.get('/analytics/tasks/top-performers', { params });

    // Handle different response formats
    const data = response.data;

    // If it's wrapped in a data property, unwrap it
    if (data && typeof data === 'object' && 'data' in data) {
      return Array.isArray(data.data) ? data.data : [];
    }

    // If it's directly an array
    if (Array.isArray(data)) {
      return data;
    }

    console.warn('Unexpected top performers response format:', data);
    return [];
  } catch (error) {
    console.error('Failed to fetch top performers:', error);
    throw error;
  }
};

/**
 * Get department task statistics
 */
export const getDepartmentTaskStats = async (
  period: PeriodType = 'week'
): Promise<DepartmentTaskStats[]> => {
  try {
    const response = await api.get('/analytics/tasks/departments', {
      params: { period },
    });

    // Handle different response formats
    const data = response.data;

    // If it's wrapped in a data property, unwrap it
    if (data && typeof data === 'object' && 'data' in data) {
      return Array.isArray(data.data) ? data.data : [];
    }

    // If it's directly an array
    if (Array.isArray(data)) {
      return data;
    }

    console.warn('Unexpected department stats response format:', data);
    return [];
  } catch (error) {
    console.error('Failed to fetch department task stats:', error);
    throw error;
  }
};

/**
 * Get security dashboard analytics
 */
export const getSecurityDashboard = async (
  period: string = '7d'
): Promise<SecurityDashboardData> => {
  try {
    const response = await api.get('/analytics/security/dashboard', {
      params: { period },
    });

    // Handle different response formats
    const data = response.data;

    // If it's wrapped in a data property, unwrap it
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data as SecurityDashboardData;
    }

    // Return as is if it has the expected structure
    if (data && data.login_stats) {
      return data as SecurityDashboardData;
    }

    console.warn('Unexpected security response format:', data);
    throw new Error('Invalid security response format');
  } catch (error) {
    console.error('Failed to fetch security dashboard:', error);
    throw error;
  }
};

/**
 * Get user activity analytics
 */
export const getUserActivity = async (startDate?: string, endDate?: string): Promise<any> => {
  try {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get('/analytics/users/activity', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    throw error;
  }
};

/**
 * Get message statistics
 */
export const getMessageStats = async (): Promise<any> => {
  try {
    const response = await api.get('/analytics/messages/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch message stats:', error);
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format number with locale
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU').format(num);
};

/**
 * Get period value from StatValue
 */
export const getPeriodValue = (stat: StatValue, period: PeriodType): number => {
  switch (period) {
    case 'today':
      return stat.today || 0;
    case 'week':
      return stat.week || 0;
    case 'month':
      return stat.month || 0;
    case 'year':
      return stat.month || 0; // Используем month для year, если year не доступен
    default:
      return stat.week || 0;
  }
};

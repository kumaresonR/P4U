import { api } from '@/lib/apiClient';

export async function logActivity(type: string, description: string, metadata: Record<string, any> = {}) {
  // Keep local cache for quick access
  try {
    const activities = JSON.parse(localStorage.getItem('app_db_activities') || '[]');
    activities.unshift({ id: `ACT-${Date.now()}`, type, description, metadata, timestamp: new Date().toISOString() });
    if (activities.length > 100) activities.length = 100;
    localStorage.setItem('app_db_activities', JSON.stringify(activities));
  } catch { /* no-op */ }

  // Best-effort backend log (silent fail)
  api.post('/admin/activity-logs', { type, description, metadata }).catch(() => {});
}

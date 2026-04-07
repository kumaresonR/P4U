import { api } from '@/lib/apiClient';
import { tokenStore } from '@/lib/apiClient';

export async function logAudit(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
) {
  // Silent fail — don't break app for audit failures
  api.post('/admin/audit-logs', {
    table_name: tableName,
    operation,
    record_id: recordId,
    old_data: oldData || null,
    new_data: newData || null,
  }).catch(() => {});
}

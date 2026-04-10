import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, ReportLog, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function ReportLogPage() {
  const [data, setData] = useState<PaginatedResponse<ReportLog> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();

  const fetchData = useCallback(() => {
    api
      .getReportLog({ page, per_page: 10, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo })
      .then(setData)
      .catch(() => {
        toast.error('Failed to load report log');
        setData({ data: [], total: 0, page: 1, per_page: 10, total_pages: 0 });
      });
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "Ref." },
      { key: "reason", label: "Reason" },
      { key: "property_id", label: "Property id" },
      { key: "user_id", label: "Reporter id" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Submitted" },
    ], "report_log");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Report Log</h1>
        <p className="page-description">{data.total.toLocaleString()} property listing reports</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Ref." },
          { key: "reason", label: "Reason", render: (r) => <span className="font-medium line-clamp-2 max-w-[200px]">{r.reason}</span> },
          { key: "property_id", label: "Listing", render: (r) => (
            <span className="text-sm line-clamp-2 max-w-[180px]">{r.property?.title || '—'}</span>
          ) },
          { key: "user_id", label: "Reporter ref." },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "created_at", label: "Submitted", render: (r) => (
            <span className="text-xs">{new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          )},
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" },
          { value: "resolved", label: "Resolved" },
          { value: "rejected", label: "Rejected" },
        ] }]}
      />
    </AdminLayout>
  );
}

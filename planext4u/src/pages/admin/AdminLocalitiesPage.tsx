import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MapPin } from "lucide-react";
import { api as http } from "@/lib/apiClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** CRUD matches backend `PropertyLocality` (name, optional city_id, status). */
export default function AdminLocalitiesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", city_id: "", status: "active" });
  const [search, setSearch] = useState("");

  const { data: localities } = useQuery({
    queryKey: ["adminLocalities"],
    queryFn: async () => http.get<any[]>("/properties/admin/localities"),
  });

  const filtered = (localities || []).filter((l: any) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name required");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      status: form.status || "active",
    };
    if (form.city_id.trim()) payload.city_id = form.city_id.trim();
    else payload.city_id = null;
    try {
      if (editing) await http.put(`/properties/admin/localities/${editing.id}`, payload);
      else await http.post("/properties/admin/localities", payload);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return;
    }
    toast.success(editing ? "Updated!" : "Added!");
    setShowModal(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/properties/admin/localities/${id}`);
    } catch {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const openEdit = (l: any) => {
    setEditing(l);
    setForm({
      name: l.name || "",
      city_id: l.city_id || "",
      status: l.status || "active",
    });
    setShowModal(true);
  };

  const columns = [
    { key: "name", label: "Locality" },
    { key: "city_id", label: "City ID", render: (l: any) => <code className="text-[10px] bg-muted px-1 rounded">{l.city_id || "—"}</code> },
    { key: "status", label: "Status", render: (l: any) => <StatusBadge status={l.status} /> },
    { key: "actions", label: "", render: (l: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); openEdit(l); }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}>Delete</Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <div className="space-y-2 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5" /> Property localities</h1>
        <p className="text-xs text-muted-foreground">Managed via Express API. Optional city ID must be a valid UUID from your cities master data.</p>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        total={filtered.length}
        page={1} perPage={50} totalPages={1}
        onPageChange={() => {}}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setForm({ name: "", city_id: "", status: "active" });
          setShowModal(true);
        }}
        addLabel="Add Locality"
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogTitle>{editing ? "Edit" : "Add"} Locality</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">City ID (UUID, optional)</Label><Input value={form.city_id} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))} placeholder="00000000-0000-0000-0000-000000000000" /></div>
            <div><Label className="text-xs">Status</Label><Input value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} placeholder="active" /></div>
          </div>
          <Button className="w-full mt-2" onClick={handleSave}>Save</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

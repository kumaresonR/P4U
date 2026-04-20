import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api as http } from "@/lib/apiClient";
import { Product } from "@/lib/api";
import { ProductModal } from "@/components/admin/modals/ProductModal";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

export default function VendorProductsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || vendorUser?.id || "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("create");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendorProducts", vendorId],
    queryFn: () => http.get<Product[]>("/products/vendor/my"),
    enabled: !!vendorId,
  });

  const handleSave = useCallback(
    async (id: string, updates: Partial<Product>) => {
      await http.put(`/products/vendor/my/${id}`, updates);
      toast.success("Product updated");
      await qc.invalidateQueries({ queryKey: ["vendorProducts"] });
    },
    [qc],
  );

  const handleCreate = useCallback(
    async (data: Partial<Product>) => {
      await http.post("/products/vendor/my", data);
      toast.success("Product submitted");
      await qc.invalidateQueries({ queryKey: ["vendorProducts"] });
    },
    [qc],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await http.delete(`/products/vendor/my/${id}`);
      toast.success("Product removed");
      await qc.invalidateQueries({ queryKey: ["vendorProducts"] });
    },
    [qc],
  );

  const openModal = (product: Product | null, mode: "view" | "edit" | "create") => {
    setSelected(product);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have header + data rows");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredCols = ["title", "price"];
      const missing = requiredCols.filter((c) => !headers.includes(c) && !(c === "title" && headers.includes("name")));
      if (missing.length > 0) {
        toast.error(`CSV is missing required column(s): ${missing.join(", ")}. Expected columns: title, description, price, tax, discount, stock, emoji, image.`);
        return;
      }
      let count = 0;
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = vals[j] || "";
        });
        const price = parseFloat(row.price);
        if (!row.title && !row.name) { errors.push(`Row ${i + 1}: missing title`); continue; }
        if (isNaN(price) || price < 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
        try {
          await http.post("/products/vendor/my", {
            title: row.title || row.name || `Product ${i}`,
            description: row.description || "",
            price,
            tax: parseFloat(row.tax) || 0,
            discount: parseFloat(row.discount) || 0,
            stock: parseInt(row.stock, 10) || 0,
            status: "draft",
            emoji: row.emoji || "📦",
            image: row.image || null,
          });
          count++;
        } catch (err: any) {
          errors.push(`Row ${i + 1}: ${err?.message || "server rejected row"}`);
        }
      }
      if (count > 0) toast.success(`${count} products imported`);
      if (errors.length > 0) {
        toast.error(`${errors.length} row(s) failed. First: ${errors[0]}`, { duration: 8000 });
      }
      qc.invalidateQueries({ queryKey: ["vendorProducts"] });
      setShowCsvDialog(false);
    };
    reader.readAsText(file);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const filtered =
    products?.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    }) || [];

  return (
    <VendorLayout title={`My Products (${filtered.length})`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
              Clear
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowCsvDialog(true)}>
            <Upload className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={() => openModal(null, "create")}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No products yet. Click &quot;Add Product&quot; for the full editor (same as admin).</p>
            </Card>
          ) : (
            filtered.map((p) => (
              <Card key={p.id} className="p-4 flex items-center gap-4">
                <div className="h-14 w-14 bg-secondary/30 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{p.emoji || "📦"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{p.title}</h3>
                    <Badge className={`${statusStyle[p.status] || ""} border-0 text-[10px]`}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>₹{Number(p.price).toLocaleString()}</span>
                    <span>Stock: {p.stock ?? 0}</span>
                    <span>{p.sales ?? 0} sold</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openModal(p, "view")}>
                      <Edit className="h-4 w-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModal(p, "edit")}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))
          )}
        </div>
      </div>

      <ProductModal
        product={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        isVendor
        preselectedVendorId={vendorId}
        onSave={handleSave}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />

      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Quick CSV (title, description, price, tax, discount, stock, emoji, image). For full fields, add products one-by-one.
            </p>
            <Input type="file" accept=".csv" onChange={handleCsvUpload} />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const csv =
                  "title,description,price,tax,discount,stock,emoji,image\nSample Product,A great product,999,50,0,100,📦,";
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "product-template.csv";
                a.click();
              }}
            >
              Download Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}

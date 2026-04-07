import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api as http, tokenStore } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
import { Upload, FolderPlus, Image, Trash2, Search, Video } from "lucide-react";

export default function VendorMediaLibraryPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "";
  const qc = useQueryClient();
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const vendorFolders = ["products", "logos", "backgrounds", "icons", "general"];

  const { data: media } = useQuery({
    queryKey: ["vendorMedia", vendorId, folder, search],
    queryFn: async () => {
      const params: any = { per_page: 50 };
      if (folder !== "all") params.folder = `vendor-${vendorId}/${folder}`;
      if (search) params.search = search;
      const res = await http.get<any>('/vendor/media-library', params);
      return (Array.isArray(res) ? res : (res?.data || [])) as any[];
    },
    enabled: !!vendorId,
  });

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || !vendorId) return;
    setUploading(true);
    const targetFolder = folder === "all" ? "general" : folder;
    try {
      const token = tokenStore.getAccess();
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `vendor-${vendorId}/${targetFolder}`);
        const res = await fetch(`${BASE_URL}/vendor/media-library/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) { toast.error(`Failed: ${file.name}`); continue; }
      }
      toast.success("Uploaded successfully");
      qc.invalidateQueries({ queryKey: ["vendorMedia"] });
    } finally { setUploading(false); }
  }, [vendorId, folder, qc]);

  const handleDelete = async (item: any) => {
    if (!confirm("Delete this file?")) return;
    await http.delete(`/vendor/media-library/${item.id}`);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["vendorMedia"] });
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    vendorFolders.push(newFolderName.trim());
    setFolder(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
    toast.success("Folder created");
  };

  return (
    <VendorLayout title="Media Library">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search files..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Folder" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              {vendorFolders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowNewFolder(true)}><FolderPlus className="h-4 w-4 mr-1" /> New Folder</Button>
          <label>
            <Button asChild disabled={uploading}><span><Upload className="h-4 w-4 mr-1" /> Upload</span></Button>
            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>

        {/* Drop zone */}
        <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center mb-6 hover:border-primary/30 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drag & drop files here or use the upload button</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(media || []).map((item: any) => (
            <Card key={item.id} className="relative group overflow-hidden">
              <div className="aspect-square bg-secondary/20 flex items-center justify-center">
                {item.file_type === "video" ? (
                  <Video className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs truncate">{item.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{item.folder?.split("/").pop()}</p>
              </div>
              <button onClick={() => handleDelete(item)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            </Card>
          ))}
          {(!media || media.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No files yet. Upload your first file!</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Create Folder</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label>Folder Name</Label><Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. banners" /></div>
            <Button className="w-full" onClick={createFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}

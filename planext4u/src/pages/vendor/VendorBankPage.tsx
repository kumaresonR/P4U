import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CreditCard, Trash2, CheckCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api as http } from "@/lib/apiClient";
import { toast } from "sonner";

interface BankAccount {
  id: string; vendor_id: string; bank_name: string; account_holder: string;
  account_number: string; ifsc_code: string; account_type: string; is_primary: boolean;
  created_at: string;
}

interface BankForm {
  bank_name: string; account_holder: string; account_number: string;
  ifsc_code: string; account_type: string;
}

const emptyForm: BankForm = {
  bank_name: "", account_holder: "", account_number: "", ifsc_code: "", account_type: "savings",
};

export default function VendorBankPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BankForm>(emptyForm);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["vendorBankAccounts", vendorId],
    queryFn: () => http.get<BankAccount[]>('/vendor/bank-accounts'),
  });

  const addMutation = useMutation({
    mutationFn: (formData: BankForm) => http.post('/vendor/bank-accounts', formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorBankAccounts"] });
      setModalOpen(false); setForm(emptyForm);
      toast.success("Bank account added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setPrimary = useMutation({
    mutationFn: (id: string) => http.patch(`/vendor/bank-accounts/${id}/primary`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorBankAccounts"] });
      toast.success("Primary account updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => http.delete(`/vendor/bank-accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorBankAccounts"] });
      toast.success("Bank account removed");
    },
  });

  return (
    <VendorLayout title="Bank Accounts">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Manage your bank accounts for settlement payouts.</p>
          <Button onClick={() => { setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
        </div>

        {isLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
          accounts?.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No bank accounts added. Add one to receive settlement payouts.</p>
            </Card>
          ) :
          accounts?.map((acc) => (
            <Card key={acc.id} className={`p-4 ${acc.is_primary ? 'border-primary/50 bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{acc.bank_name}</h3>
                      {acc.is_primary && <Badge className="bg-primary text-primary-foreground text-[10px] border-0">Primary</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{acc.account_holder}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A/C: ****{acc.account_number?.slice(-4)} • IFSC: {acc.ifsc_code} • {acc.account_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!acc.is_primary && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPrimary.mutate(acc.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Set Primary
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(acc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>Add your bank details for settlement payouts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4">
            <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} required placeholder="e.g. State Bank of India" /></div>
            <div><Label>Account Holder Name</Label><Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} required /></div>
            <div><Label>Account Number</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} required /></div>
            <div><Label>IFSC Code</Label><Input value={form.ifsc_code} onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })} required placeholder="e.g. SBIN0001234" /></div>
            <div><Label>Account Type</Label>
              <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Bank Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}

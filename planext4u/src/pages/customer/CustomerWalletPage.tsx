import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, ArrowDownLeft, Gift, ShoppingBag, ChevronLeft, ChevronRight, AlertTriangle, Heart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api as http } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";

const ITEMS_PER_PAGE = 8;

export default function CustomerWalletPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';

  /** Customer wallet — must use /customers/me/wallet (admin /points-transactions is not for customers). */
  const { data: walletData, isLoading } = useQuery({
    queryKey: ["customerWallet", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return await http.get<{ balance: number; transactions: Array<Record<string, unknown>> }>("/customers/me/wallet");
    },
    enabled: !!customerId,
  });

  const balance = walletData?.balance ?? 0;
  const userTransactions = (walletData?.transactions || []).filter((t: any) => (t.points as number) > 0);

  // Points expiring this month
  const { data: expiringPoints } = useQuery({
    queryKey: ["expiringPoints", customerId],
    queryFn: async () => {
      if (!customerId) return 0;
      const res = await http.get<any>('/profile/expiring-points').catch(() => ({ points: 0 }));
      return (res as any)?.points || 0;
    },
    enabled: !!customerId,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(userTransactions.length / ITEMS_PER_PAGE));
  const paginated = userTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const typeIcon = (type: string) => {
    if (type === "welcome") return <Gift className="h-4 w-4 text-primary" />;
    if (type === "referral") return <ArrowDownLeft className="h-4 w-4 text-success" />;
    if (type === "social_post_like_received") return <Heart className="h-4 w-4 text-rose-500" />;
    return <ShoppingBag className="h-4 w-4 text-warning" />;
  };

  const sumType = (t: string) =>
    userTransactions.filter((x: any) => x.type === t).reduce((s: number, x: any) => s + (x.points || 0), 0);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wallet</h1>
        </div>

        <Card className="p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-8 w-8" />
            <div>
              <p className="text-xs opacity-80">Available Balance</p>
              <p className="text-3xl font-bold">{balance.toLocaleString()} <span className="text-sm font-normal">points</span></p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" className="flex-1" asChild>
              <Link to="/app/browse" className="inline-flex items-center justify-center gap-1 w-full">
                <Store className="h-3.5 w-3.5 shrink-0" /> Shop & redeem
              </Link>
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" asChild>
              <Link to="/app/referrals" className="inline-flex items-center justify-center gap-1 w-full">
                <Gift className="h-3.5 w-3.5 shrink-0" /> Refer & earn
              </Link>
            </Button>
          </div>
        </Card>

        {/* Expiring points alert */}
        {(expiringPoints || 0) > 0 && (
          <Card className="p-3 bg-warning/10 border-warning/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning">{expiringPoints} points expiring this month!</p>
              <p className="text-[10px] text-muted-foreground">Use them before month-end by placing orders</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" asChild>
              <Link to="/app/browse">Shop Now</Link>
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-success">+{sumType("referral")}</p>
            <p className="text-[10px] text-muted-foreground">Referral</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-warning">+{sumType("order_reward")}</p>
            <p className="text-[10px] text-muted-foreground">Order rewards</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-primary">+{sumType("welcome")}</p>
            <p className="text-[10px] text-muted-foreground">Welcome bonus</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-rose-600">+{sumType("social_post_like_received")}</p>
            <p className="text-[10px] text-muted-foreground">Post likes (Socio)</p>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Transaction History</h2>
            <span className="text-xs text-muted-foreground">{userTransactions.length} transactions</span>
          </div>
          <div className="space-y-2">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
              paginated.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet</p> :
              paginated.map((t: any) => (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    {typeIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0 text-xs">+{t.points}</Badge>
                </Card>
              ))}
          </div>

          {userTransactions.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

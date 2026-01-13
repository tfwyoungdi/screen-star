import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, History, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface Transaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  customer: {
    full_name: string;
    email: string;
  } | null;
  booking: {
    booking_reference: string;
  } | null;
  reward: {
    name: string;
  } | null;
}

export function LoyaltyTransactionHistory() {
  const { data: profile } = useUserProfile();
  const { getEffectiveOrganizationId } = useImpersonation();
  const organizationId = getEffectiveOrganizationId(profile?.organization_id);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["loyalty-transactions-admin", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select(`
          *,
          customer:customers(full_name, email),
          booking:bookings(booking_reference),
          reward:loyalty_rewards(name)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!organizationId,
  });

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch = !searchQuery || 
      tx.customer?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customer?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.booking?.booking_reference.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTransactionBadge = (type: string) => {
    const styles: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      earned: { label: "Earned", variant: "default" },
      redeemed: { label: "Redeemed", variant: "secondary" },
      welcome_bonus: { label: "Welcome Bonus", variant: "outline" },
      adjustment: { label: "Adjustment", variant: "outline" },
      expired: { label: "Expired", variant: "destructive" },
    };
    return styles[type] || { label: type, variant: "outline" as const };
  };

  // Calculate summary stats
  const totalEarned = transactions?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0) || 0;
  const totalRedeemed = transactions?.filter(t => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;
  const uniqueCustomers = new Set(transactions?.map(t => t.customer?.email)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Loyalty Transaction History
        </CardTitle>
        <CardDescription>
          Track all loyalty point earnings and redemptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Points Earned</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <TrendingDown className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-600">{totalRedeemed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Points Redeemed</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-primary">{uniqueCustomers}</p>
            <p className="text-xs text-muted-foreground">Active Members</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or booking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="welcome_bonus">Welcome Bonus</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const badgeInfo = getTransactionBadge(tx.transaction_type);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.customer?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{tx.customer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description || tx.reward?.name || tx.booking?.booking_reference || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${tx.points > 0 ? "text-green-600" : "text-orange-600"}`}>
                          {tx.points > 0 ? "+" : ""}{tx.points}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

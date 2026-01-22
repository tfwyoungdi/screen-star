import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Loader2, Trash2, Tag, Percent, DollarSign, Calendar, Users, Film, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  restricted_movie_ids: string[] | null;
  restricted_showtime_ids: string[] | null;
}

interface NewPromoCode {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  min_purchase_amount: number;
  valid_from: string;
  valid_until: string | null;
  restricted_movie_ids: string[];
  restricted_showtime_ids: string[];
}

interface Movie {
  id: string;
  title: string;
  status: string;
}

interface Showtime {
  id: string;
  start_time: string;
  movies: { title: string };
  screens: { name: string };
}

export default function PromoCodeManagement() {
  const { data: organization } = useOrganization();
  const { getEffectiveOrganizationId, isImpersonating, impersonatedOrganization } = useImpersonation();
  const effectiveOrgId = getEffectiveOrganizationId(organization?.id);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState<NewPromoCode>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    min_purchase_amount: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: null,
    restricted_movie_ids: [],
    restricted_showtime_ids: [],
  });
  const [showRestrictions, setShowRestrictions] = useState(false);

  // Fetch movies for restrictions
  const { data: movies } = useQuery({
    queryKey: ['movies-for-promos', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, status')
        .eq('organization_id', effectiveOrgId)
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as Movie[];
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch upcoming showtimes for restrictions
  const { data: showtimes } = useQuery({
    queryKey: ['showtimes-for-promos', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select('id, start_time, movies(title), screens(name)')
        .eq('organization_id', effectiveOrgId)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(50);
      if (error) throw error;
      return data as Showtime[];
    },
    enabled: !!effectiveOrgId,
  });

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['promo-codes', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PromoCode[];
    },
    enabled: !!effectiveOrgId,
  });

  const createMutation = useMutation({
    mutationFn: async (promoCode: NewPromoCode) => {
      if (isImpersonating) {
        throw new Error('Cannot modify data in impersonation mode');
      }
      if (!effectiveOrgId) throw new Error('No organization');
      const { error } = await supabase.from('promo_codes').insert({
        organization_id: effectiveOrgId,
        code: promoCode.code.toUpperCase(),
        description: promoCode.description || null,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        max_uses: promoCode.max_uses,
        min_purchase_amount: promoCode.min_purchase_amount,
        valid_from: promoCode.valid_from,
        valid_until: promoCode.valid_until,
        restricted_movie_ids: promoCode.restricted_movie_ids.length > 0 ? promoCode.restricted_movie_ids : null,
        restricted_showtime_ids: promoCode.restricted_showtime_ids.length > 0 ? promoCode.restricted_showtime_ids : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setIsDialogOpen(false);
      setNewCode({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: null,
        min_purchase_amount: 0,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: null,
        restricted_movie_ids: [],
        restricted_showtime_ids: [],
      });
      setShowRestrictions(false);
      toast.success('Promo code created');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('This code already exists');
      } else {
        toast.error('Failed to create promo code');
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (isImpersonating) {
        throw new Error('Cannot modify data in impersonation mode');
      }
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isImpersonating) {
        throw new Error('Cannot modify data in impersonation mode');
      }
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Promo code deleted');
    },
    onError: () => {
      toast.error('Failed to delete promo code');
    },
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code: result }));
  };

  const getStatusBadge = (promo: PromoCode) => {
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

    if (!promo.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (validFrom > now) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    if (validUntil && validUntil < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return <Badge variant="destructive">Used Up</Badge>;
    }
    return <Badge className="bg-green-600">Active</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promo Codes</h1>
            <p className="text-muted-foreground">
              Create and manage discount codes for your customers
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Promo Code</DialogTitle>
                <DialogDescription>
                  Create a new discount code for customers
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCode.code}
                      onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="SUMMER20"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={generateRandomCode}>
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newCode.description}
                    onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Summer sale discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select
                      value={newCode.discount_type}
                      onValueChange={(value) => setNewCode(prev => ({ ...prev, discount_type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      value={newCode.discount_value}
                      onChange={(e) => setNewCode(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                      min={0}
                      max={newCode.discount_type === 'percentage' ? 100 : undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses (optional)</Label>
                    <Input
                      type="number"
                      value={newCode.max_uses || ''}
                      onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Unlimited"
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min Purchase ($)</Label>
                    <Input
                      type="number"
                      value={newCode.min_purchase_amount}
                      onChange={(e) => setNewCode(prev => ({ ...prev, min_purchase_amount: parseFloat(e.target.value) || 0 }))}
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input
                      type="date"
                      value={newCode.valid_from}
                      onChange={(e) => setNewCode(prev => ({ ...prev, valid_from: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valid Until (optional)</Label>
                    <Input
                      type="date"
                      value={newCode.valid_until || ''}
                      onChange={(e) => setNewCode(prev => ({ ...prev, valid_until: e.target.value || null }))}
                    />
                  </div>
                </div>

                {/* Movie/Showtime Restrictions */}
                <Collapsible open={showRestrictions} onOpenChange={setShowRestrictions}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Restrict to Movies/Showtimes
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {newCode.restricted_movie_ids.length + newCode.restricted_showtime_ids.length > 0 
                          ? `${newCode.restricted_movie_ids.length + newCode.restricted_showtime_ids.length} selected`
                          : 'Optional'}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* Movie Restrictions */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Restrict to specific movies
                      </Label>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {movies && movies.length > 0 ? (
                          <div className="space-y-2">
                            {movies.map((movie) => (
                              <div key={movie.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`movie-${movie.id}`}
                                  checked={newCode.restricted_movie_ids.includes(movie.id)}
                                  onCheckedChange={(checked) => {
                                    setNewCode(prev => ({
                                      ...prev,
                                      restricted_movie_ids: checked 
                                        ? [...prev.restricted_movie_ids, movie.id]
                                        : prev.restricted_movie_ids.filter(id => id !== movie.id)
                                    }));
                                  }}
                                />
                                <label htmlFor={`movie-${movie.id}`} className="text-sm cursor-pointer flex-1">
                                  {movie.title}
                                  <Badge variant="outline" className="ml-2 text-xs">{movie.status}</Badge>
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No movies available</p>
                        )}
                      </ScrollArea>
                    </div>

                    {/* Showtime Restrictions */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Restrict to specific showtimes
                      </Label>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {showtimes && showtimes.length > 0 ? (
                          <div className="space-y-2">
                            {showtimes.map((showtime) => (
                              <div key={showtime.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`showtime-${showtime.id}`}
                                  checked={newCode.restricted_showtime_ids.includes(showtime.id)}
                                  onCheckedChange={(checked) => {
                                    setNewCode(prev => ({
                                      ...prev,
                                      restricted_showtime_ids: checked 
                                        ? [...prev.restricted_showtime_ids, showtime.id]
                                        : prev.restricted_showtime_ids.filter(id => id !== showtime.id)
                                    }));
                                  }}
                                />
                                <label htmlFor={`showtime-${showtime.id}`} className="text-sm cursor-pointer flex-1">
                                  {showtime.movies?.title} - {showtime.screens?.name}
                                  <span className="text-muted-foreground ml-1">
                                    ({format(new Date(showtime.start_time), 'MMM d, h:mm a')})
                                  </span>
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No upcoming showtimes</p>
                        )}
                      </ScrollArea>
                    </div>

                    {(newCode.restricted_movie_ids.length > 0 || newCode.restricted_showtime_ids.length > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewCode(prev => ({ ...prev, restricted_movie_ids: [], restricted_showtime_ids: [] }))}
                      >
                        Clear all restrictions
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(newCode)}
                  disabled={!newCode.code || newCode.discount_value <= 0 || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Tag className="h-4 w-4 mr-2" />
                  )}
                  Create Promo Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{promoCodes?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {promoCodes?.filter(p => p.is_active).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {promoCodes?.reduce((sum, p) => sum + p.current_uses, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Promo Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Promo Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {promoCodes && promoCodes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono font-bold">{promo.code}</span>
                          {promo.description && (
                            <p className="text-xs text-muted-foreground">{promo.description}</p>
                          )}
                          {/* Show restrictions badges */}
                          {(promo.restricted_movie_ids?.length || promo.restricted_showtime_ids?.length) ? (
                            <div className="flex items-center gap-1 mt-1">
                              {promo.restricted_movie_ids?.length ? (
                                <Badge variant="outline" className="text-xs">
                                  <Film className="h-3 w-3 mr-1" />
                                  {promo.restricted_movie_ids.length} movie{promo.restricted_movie_ids.length > 1 ? 's' : ''}
                                </Badge>
                              ) : null}
                              {promo.restricted_showtime_ids?.length ? (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {promo.restricted_showtime_ids.length} showtime{promo.restricted_showtime_ids.length > 1 ? 's' : ''}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {promo.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                              <span>{promo.discount_value}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{promo.discount_value}</span>
                            </>
                          )}
                        </div>
                        {promo.min_purchase_amount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Min: ${promo.min_purchase_amount}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {promo.current_uses}
                            {promo.max_uses && ` / ${promo.max_uses}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(promo.valid_from), 'MMM d')}
                            {promo.valid_until && ` - ${format(new Date(promo.valid_until), 'MMM d')}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(promo)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: promo.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this promo code?')) {
                              deleteMutation.mutate(promo.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No promo codes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first promo code to offer discounts to customers
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

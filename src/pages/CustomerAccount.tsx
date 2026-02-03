import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Gift, Star, Ticket, LogOut, Clock, History, Mail, X, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CustomerProfileEditor } from '@/components/customer/CustomerProfileEditor';
import { CustomerBookingHistory } from '@/components/customer/CustomerBookingHistory';
import { MovieRecommendations } from '@/components/customer/MovieRecommendations';

interface LoyaltyTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  discount_value: number | null;
}

export default function CustomerAccount() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, customer, loading: authLoading, signOut, refreshCustomer } = useCustomerAuth();
  const [dismissedVerification, setDismissedVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Fetch cinema data
  const { data: cinema, isLoading: cinemaLoading } = useQuery({
    queryKey: ['cinema', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        // Use organizations_public view to avoid permission denied errors for anonymous users
        .from('organizations_public')
        .select('id, name, logo_url, primary_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Refresh customer data when cinema loads
  useEffect(() => {
    if (cinema && user) {
      refreshCustomer(cinema.id);
    }
  }, [cinema, user, refreshCustomer]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/cinema/${slug}/login`);
    }
  }, [authLoading, user, slug, navigate]);

  // Fetch loyalty transactions (last 30 days)
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['customer-transactions', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LoyaltyTransaction[];
    },
    enabled: !!customer,
  });

  // Fetch available rewards
  const { data: rewards = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ['customer-rewards', cinema?.id],
    queryFn: async () => {
      if (!cinema) return [];
      
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('organization_id', cinema.id)
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!cinema,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate(`/cinema/${slug}`);
  };

  if (cinemaLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!cinema) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Cinema Not Found</h1>
          <Link to="/" className="text-amber-400 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <Star className="h-4 w-4 text-green-400" />;
      case 'redeemed':
        return <Gift className="h-4 w-4 text-amber-400" />;
      case 'welcome_bonus':
        return <Ticket className="h-4 w-4 text-blue-400" />;
      default:
        return <History className="h-4 w-4 text-white/60" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link 
            to={`/cinema/${slug}`} 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {cinema.name}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="container mx-auto max-w-4xl">
          {/* Email Verification Reminder */}
          {!isEmailVerified && !dismissedVerification && (
            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Verify your email</p>
                    <AlertDescription className="text-amber-400/80 text-sm mt-1">
                      Please verify your email address to fully access your account. Check your inbox for the verification link.
                    </AlertDescription>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="mt-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-0"
                    >
                      {resendingVerification ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedVerification(true)}
                  className="text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Alert>
          )}

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {customer?.full_name || 'Guest'}!
            </h1>
            <p className="text-white/60">
              View your loyalty points and transaction history
            </p>
          </div>

          {/* Points Card */}
          <Card className="bg-white/5 border-white/10 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Your Points Balance</p>
                  <p className="text-4xl font-bold" style={{ color: cinema.primary_color }}>
                    {customer?.loyalty_points.toLocaleString() || 0}
                  </p>
                  <p className="text-white/40 text-sm mt-2">
                    {customer?.total_bookings || 0} bookings • ${customer?.total_spent?.toFixed(2) || '0.00'} spent
                  </p>
                </div>
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cinema.primary_color}20` }}
                >
                  <Star className="h-10 w-10" style={{ color: cinema.primary_color }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="recommendations" className="w-full">
            <TabsList className="bg-white/5 border-white/10 mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger 
                value="recommendations" 
                className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                For You
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
              >
                <Ticket className="h-4 w-4 mr-2" />
                My Bookings
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
              >
                <Gift className="h-4 w-4 mr-2" />
                Rewards
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
              >
                <History className="h-4 w-4 mr-2" />
                Points History
              </TabsTrigger>
            </TabsList>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              {customer && cinema && (
                <MovieRecommendations
                  customerId={customer.id}
                  organizationId={cinema.id}
                  primaryColor={cinema.primary_color}
                />
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              {customer && (
                <CustomerProfileEditor
                  customerId={customer.id}
                  fullName={customer.full_name}
                  phone={customer.phone}
                  email={customer.email}
                  primaryColor={cinema.primary_color}
                  onUpdate={() => refreshCustomer(cinema.id)}
                />
              )}
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              {customer && (
                <CustomerBookingHistory
                  customerId={customer.id}
                  primaryColor={cinema.primary_color}
                />
              )}
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards">
              {rewardsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              ) : rewards.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8 text-center">
                    <Gift className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">No rewards available at this time</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rewards.map((reward) => {
                    const canRedeem = (customer?.loyalty_points || 0) >= reward.points_required;
                    return (
                      <Card 
                        key={reward.id} 
                        className={`bg-white/5 border-white/10 ${canRedeem ? '' : 'opacity-60'}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{reward.name}</h3>
                              {reward.description && (
                                <p className="text-white/60 text-sm mt-1">{reward.description}</p>
                              )}
                            </div>
                            <Badge 
                              variant="secondary"
                              className="bg-white/10 text-white border-0"
                            >
                              {reward.reward_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" style={{ color: cinema.primary_color }} />
                              <span 
                                className="font-semibold"
                                style={{ color: cinema.primary_color }}
                              >
                                {reward.points_required.toLocaleString()} points
                              </span>
                            </div>
                            {canRedeem ? (
                              <Badge 
                                className="border-0"
                                style={{ 
                                  backgroundColor: `${cinema.primary_color}20`,
                                  color: cinema.primary_color,
                                }}
                              >
                                Available
                              </Badge>
                            ) : (
                              <span className="text-white/40 text-sm">
                                Need {(reward.points_required - (customer?.loyalty_points || 0)).toLocaleString()} more
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              <p className="text-white/40 text-sm text-center mt-6">
                Redeem your rewards at checkout when booking tickets
              </p>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                  <p className="text-white/40 text-sm">
                    Transaction history is kept for 30 days
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {transactionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="p-8 text-center">
                      <History className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No transactions yet</p>
                      <p className="text-white/40 text-sm mt-2">
                        Book a movie to start earning points!
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {transactions.map((transaction) => (
                        <div 
                          key={transaction.id}
                          className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                              {getTransactionIcon(transaction.transaction_type)}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {transaction.transaction_type.replace('_', ' ')}
                              </p>
                              <p className="text-white/40 text-sm">
                                {transaction.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.points > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {transaction.points > 0 ? '+' : ''}{transaction.points}
                            </p>
                            <p className="text-white/40 text-xs">
                              {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

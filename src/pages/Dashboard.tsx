import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, LogOut, LayoutDashboard, Ticket, Users, BarChart3, Settings, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
}

interface Profile {
  full_name: string;
  email: string;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, organization_id')
        .eq('id', user!.id)
        .maybeSingle();

      if (profileData) {
        setProfile({ full_name: profileData.full_name, email: profileData.email });

        // Fetch organization
        if (profileData.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id, name, slug, subscription_plan')
            .eq('id', profileData.organization_id)
            .maybeSingle();

          if (orgData) {
            setOrganization(orgData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-bold text-foreground">{organization?.name || 'CineTix'}</span>
              {organization && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {organization.slug}.cinetix.com
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your cinema operations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Sales</CardDescription>
              <CardTitle className="text-2xl text-primary">$0.00</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">0 tickets sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Shows</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">No movies scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Staff Members</CardDescription>
              <CardTitle className="text-2xl">1</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Admin only</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subscription</CardDescription>
              <CardTitle className="text-2xl capitalize">{organization?.subscription_plan || 'Starter'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Current plan</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Cinema Profile</h3>
                  <p className="text-xs text-muted-foreground">Setup your cinema details</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Manage Movies</h3>
                  <p className="text-xs text-muted-foreground">Add movies & showtimes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Staff & Roles</h3>
                  <p className="text-xs text-muted-foreground">Manage team access</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure your cinema</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

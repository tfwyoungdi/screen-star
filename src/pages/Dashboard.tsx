import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization, useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Ticket, Users, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: profile, isLoading: profileLoading } = useUserProfile();

  const loading = orgLoading || profileLoading;

  return (
    <DashboardLayout>
      {loading ? (
        <div>
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      ) : (
        <>
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
            <Card
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/settings')}
            >
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

            <Card
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/staff')}
            >
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

            <Card
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/settings')}
            >
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
        </>
      )}
    </DashboardLayout>
  );
}

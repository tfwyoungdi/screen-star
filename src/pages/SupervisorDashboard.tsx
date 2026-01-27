import { useNavigate } from 'react-router-dom';
import { Ticket, ScanLine, Key, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { DailyAccessCodeManager } from '@/components/boxoffice/DailyAccessCodeManager';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const quickActions = [
    {
      title: 'Box Office',
      description: 'Sell tickets and process bookings',
      icon: Ticket,
      path: '/box-office',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Ticket Scanner',
      description: 'Scan and validate customer tickets',
      icon: ScanLine,
      path: '/gate',
      color: 'bg-chart-2/10 text-chart-2',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Supervisor Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {organization?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {profile?.full_name || 'Supervisor'}
          </h1>
          <p className="text-muted-foreground">
            Quick access to your supervisor tools
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Card 
              key={action.path}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(action.path)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Daily Access Code Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Daily Access Code</CardTitle>
            </div>
            <CardDescription>
              Generate and manage the daily staff access code for clock-in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.organization_id && (
              <DailyAccessCodeManager organizationId={profile.organization_id} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

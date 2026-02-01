import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { PlatformEmailAnalytics } from '@/components/platform-admin/PlatformEmailAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlatformCommunications() {
  const navigate = useNavigate();

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View email analytics and manage platform communications
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Cinema Communications
              </CardTitle>
              <CardDescription>
                Send bulk announcements to all or filtered cinemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/platform-admin/cinemas')} variant="outline" className="w-full">
                Go to Cinemas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Customer Communications
              </CardTitle>
              <CardDescription>
                Send bulk emails to customers across all cinemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/platform-admin/customers')} variant="outline" className="w-full">
                Go to Customers
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Email Analytics */}
        <PlatformEmailAnalytics />
      </div>
    </PlatformLayout>
  );
}

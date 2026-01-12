import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  Globe,
  Users,
  Activity,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Dashboard', href: '/platform-admin', icon: LayoutDashboard },
  { title: 'Cinemas', href: '/platform-admin/cinemas', icon: Building2 },
  { title: 'Subscription Plans', href: '/platform-admin/plans', icon: CreditCard },
  { title: 'Transactions', href: '/platform-admin/transactions', icon: Receipt },
  { title: 'Domains', href: '/platform-admin/domains', icon: Globe },
  { title: 'Users & Roles', href: '/platform-admin/users', icon: Users },
  { title: 'Monitoring', href: '/platform-admin/monitoring', icon: Activity },
  { title: 'Reports', href: '/platform-admin/reports', icon: BarChart3 },
  { title: 'Audit Logs', href: '/platform-admin/audit-logs', icon: ScrollText },
  { title: 'Support Tickets', href: '/platform-admin/tickets', icon: MessageSquare },
  { title: 'Settings', href: '/platform-admin/settings', icon: Settings },
];

export function PlatformLayout({ children }: PlatformLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Platform Admin</h2>
              <p className="text-xs text-muted-foreground">CineTix Management</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

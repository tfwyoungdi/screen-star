import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavItemsForRole, PLATFORM_ROLE_CONFIG } from '@/lib/platformRoleConfig';

interface PlatformLayoutProps {
  children: ReactNode;
}

export function PlatformLayout({ children }: PlatformLayoutProps) {
  const { signOut } = useAuth();
  const { platformRole, isLoading } = usePlatformRole();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = getNavItemsForRole(platformRole);
  const roleConfig = platformRole ? PLATFORM_ROLE_CONFIG[platformRole] : null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {roleConfig ? (
                <roleConfig.icon className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground truncate">
                {roleConfig?.label || 'Platform'}
              </h2>
              <p className="text-xs text-muted-foreground">CineTix Management</p>
            </div>
          </div>
          {roleConfig && platformRole !== 'platform_admin' && (
            <Badge className={cn('mt-3', roleConfig.color)}>
              {roleConfig.label}
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
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
          )}
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

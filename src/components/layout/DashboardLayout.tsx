import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  Film,
  LogOut,
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  Menu,
  Monitor,
  Calendar,
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Movies', url: '/movies', icon: Film },
  { title: 'Screens', url: '/screens', icon: Monitor },
  { title: 'Showtimes', url: '/showtimes', icon: Calendar },
  { title: 'Staff', url: '/staff', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const { data: organization, isLoading: loading } = useOrganization();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-sidebar-border">
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sidebar-primary/20 rounded-lg">
                <Film className="h-5 w-5 text-sidebar-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {loading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <>
                    <span className="font-bold text-sidebar-foreground block truncate">
                      {organization?.name || 'CineTix'}
                    </span>
                    {organization && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{organization.slug}.cinetix.com</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/dashboard'}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {organization && (
              <SidebarGroup>
                <SidebarGroupLabel>Public Site</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a
                          href={`/cinema/${organization.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent"
                        >
                          <Globe className="h-4 w-4" />
                          <span>View Booking Site</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-40">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>
          <div className="flex-1 p-6 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

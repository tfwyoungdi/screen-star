import { Bell, Search, Plus, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Menu, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';

interface DashboardHeaderProps {
  showSearch?: boolean;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
}

export function DashboardHeader({
  showSearch = true,
  showAddButton = false,
  addButtonLabel = 'Add New',
  onAddClick,
}: DashboardHeaderProps) {
  const { signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD';

  return (
    <>
      <CommandPalette />
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>

          {showSearch && (
            <Button
              variant="outline"
              className="hidden md:flex items-center gap-2 w-[280px] lg:w-[360px] justify-start text-muted-foreground bg-secondary/50 border-border hover:border-primary/30 hover:bg-secondary"
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
              }}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left text-sm">Search anything...</span>
              <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <Command className="h-3 w-3" />
                <span>K</span>
              </kbd>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {showAddButton && (
            <Button
              onClick={onAddClick}
              size="sm"
              className="gap-1.5 rounded-lg shadow-md shadow-primary/10"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{addButtonLabel}</span>
            </Button>
          )}

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="relative rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full ring-2 ring-card" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary/30 transition-all ml-1"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={organization?.logo_url || undefined} alt={profile?.full_name || 'Admin'} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg mx-1">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg mx-1">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive rounded-lg mx-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}

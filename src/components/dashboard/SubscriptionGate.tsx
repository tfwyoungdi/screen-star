import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionGateProps {
  isOpen: boolean;
  organizationName?: string;
}

export function SubscriptionGate({ isOpen, organizationName }: SubscriptionGateProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} modal>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Welcome to {organizationName || 'Your Cinema'}!
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your dashboard is ready. Choose a subscription plan to unlock full access and start managing your cinema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Benefits list */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Full access to all dashboard features</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Manage movies, showtimes & bookings</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Staff management & analytics</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Public website for your cinema</span>
            </div>
          </div>

          <Button 
            onClick={() => navigate('/choose-plan')} 
            className="w-full gap-2"
            size="lg"
          >
            <CreditCard className="h-4 w-4" />
            Choose Your Plan
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Select a plan that fits your cinema's needs
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

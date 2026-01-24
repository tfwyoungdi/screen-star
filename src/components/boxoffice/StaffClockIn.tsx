import { useState } from 'react';
import { startOfDay, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DollarSign, PlayCircle, Loader2, Key, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StaffClockInProps {
  userId: string;
  organizationId: string;
  onClockIn: () => void;
}

export function StaffClockIn({ userId, organizationId, onClockIn }: StaffClockInProps) {
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [error, setError] = useState('');

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      setError('');
      
      // Verify access code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('daily_access_code, daily_access_code_set_at')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      if (!org.daily_access_code) {
        throw new Error('No access code has been set today. Please contact your manager.');
      }

      // Check if the code was set today (midnight expiry)
      if (org.daily_access_code_set_at) {
        const codeSetAt = new Date(org.daily_access_code_set_at);
        if (!isToday(codeSetAt)) {
          throw new Error('Yesterday\'s access code has expired. Please ask your manager to set a new code.');
        }
      }

      if (org.daily_access_code !== accessCode) {
        throw new Error('Invalid access code. Please check with your manager.');
      }

      // Create shift
      const openingAmount = parseFloat(openingCash) || 0;
      
      const { error: shiftError } = await supabase
        .from('shifts')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          opening_cash: openingAmount,
          status: 'active',
        });

      if (shiftError) throw shiftError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('Clocked in successfully!');
      onClockIn();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to clock in');
    },
  });

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Key className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Clock In</CardTitle>
        <CardDescription>
          Enter today's access code to start your shift
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="access-code">Access Code</Label>
          <Input
            id="access-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            className="text-center text-2xl font-mono tracking-widest h-14"
            placeholder="• • • • • •"
            autoFocus
          />
          <p className="text-xs text-muted-foreground text-center">
            Get this code from your manager or posted at the register
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="opening-cash">Opening Cash Balance</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="opening-cash"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Count the cash in your drawer before starting
          </p>
        </div>

        <Button
          onClick={() => clockInMutation.mutate()}
          disabled={clockInMutation.isPending || accessCode.length !== 6}
          className="w-full h-12 text-lg gap-2"
        >
          {clockInMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
          Start Shift
        </Button>
      </CardContent>
    </Card>
  );
}

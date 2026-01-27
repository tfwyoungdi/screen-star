import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Key, RefreshCw, Copy, Check, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DailyAccessCodeManagerProps {
  organizationId: string;
}

export function DailyAccessCodeManager({ organizationId }: DailyAccessCodeManagerProps) {
  const queryClient = useQueryClient();
  const [showSetDialog, setShowSetDialog] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('23:00');

  // Fetch current access code
  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization-access-code', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('daily_access_code, daily_access_code_set_at, daily_access_code_start_time, daily_access_code_end_time')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Generate random 6-digit code
  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setNewCode(code);
    return code;
  };

  // Set access code mutation
  const setCodeMutation = useMutation({
    mutationFn: async ({ code, start, end }: { code: string; start: string; end: string }) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          daily_access_code: code,
          daily_access_code_set_at: new Date().toISOString(),
          daily_access_code_start_time: start,
          daily_access_code_end_time: end,
        })
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-access-code'] });
      setShowSetDialog(false);
      setNewCode('');
      toast.success('Daily access code updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update access code');
    },
  });

  // Clear access code mutation
  const clearCodeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('organizations')
        .update({
          daily_access_code: null,
          daily_access_code_set_at: null,
          daily_access_code_start_time: null,
          daily_access_code_end_time: null,
        })
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-access-code'] });
      toast.success('Access code cleared - staff cannot clock in without approval');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear access code');
    },
  });

  // Helper to format time for display
  const formatTimeDisplay = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const date = parse(timeStr, 'HH:mm:ss', new Date());
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Generate time options for the select
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const date = parse(timeValue, 'HH:mm', new Date());
        const label = format(date, 'h:mm a');
        options.push({ value: timeValue, label });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const copyToClipboard = () => {
    if (organization?.daily_access_code) {
      navigator.clipboard.writeText(organization.daily_access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    }
  };

  const isCodeSetToday = organization?.daily_access_code_set_at
    ? new Date(organization.daily_access_code_set_at).toDateString() === new Date().toDateString()
    : false;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Daily Access Code</CardTitle>
            </div>
            {organization?.daily_access_code && (
              <Badge variant={isCodeSetToday ? "default" : "secondary"}>
                {isCodeSetToday ? 'Set Today' : 'From Previous Day'}
              </Badge>
            )}
          </div>
          <CardDescription>
            Staff can use this code to clock in without manager approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization?.daily_access_code ? (
            <>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Current Code</p>
                  <p className="text-3xl font-mono font-bold tracking-widest">
                    {organization.daily_access_code}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {organization.daily_access_code_set_at && (
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Set at {format(new Date(organization.daily_access_code_set_at), 'h:mm a')}
                      </p>
                    )}
                    {(organization.daily_access_code_start_time || organization.daily_access_code_end_time) && (
                      <p className="text-xs text-muted-foreground">
                        Valid: {formatTimeDisplay(organization.daily_access_code_start_time) || 'Any'} - {formatTimeDisplay(organization.daily_access_code_end_time) || 'Any'}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    generateCode();
                    // Pre-fill with existing times if available
                    if (organization.daily_access_code_start_time) {
                      setStartTime(organization.daily_access_code_start_time.slice(0, 5));
                    }
                    if (organization.daily_access_code_end_time) {
                      setEndTime(organization.daily_access_code_end_time.slice(0, 5));
                    }
                    setShowSetDialog(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Change Code
                </Button>
              <Button
                  variant="destructive"
                  onClick={() => clearCodeMutation.mutate()}
                  disabled={clearCodeMutation.isPending}
              >
                {clearCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Clear'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                No access code set. Staff must get manager approval to clock in.
              </p>
              <Button
                onClick={() => {
                  generateCode();
                  setShowSetDialog(true);
                }}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Generate Today's Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSetDialog} onOpenChange={setShowSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Set Daily Access Code
            </DialogTitle>
            <DialogDescription>
              Share this code with on-site staff. Anyone with the code can clock in without approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="access-code">Access Code</Label>
              <div className="flex gap-2">
                <Input
                  id="access-code"
                  type="text"
                  maxLength={6}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateCode}
                  title="Generate new code"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                6-digit numeric code. You can customize or generate a random one.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Staff can only clock in during these hours.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setCodeMutation.mutate({ code: newCode, start: startTime, end: endTime })}
              disabled={setCodeMutation.isPending || newCode.length !== 6}
            >
              {setCodeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Set Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

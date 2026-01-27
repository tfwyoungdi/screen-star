import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Key, RefreshCw, Copy, Check, Loader2, Clock, Users, ChevronDown, ChevronUp, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DailyAccessCodeManagerProps {
  organizationId: string;
}

interface StaffClockIn {
  id: string;
  full_name: string;
  email: string;
  started_at: string;
}

export function DailyAccessCodeManager({ organizationId }: DailyAccessCodeManagerProps) {
  const queryClient = useQueryClient();
  const [showSetDialog, setShowSetDialog] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('23:00');
  const [showStaffList, setShowStaffList] = useState(false);

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

  // Fetch staff who clocked in with the current code today
  const { data: staffClockIns } = useQuery({
    queryKey: ['access-code-staff', organizationId, organization?.daily_access_code],
    queryFn: async (): Promise<StaffClockIn[]> => {
      if (!organization?.daily_access_code) return [];
      
      const todayStart = startOfDay(new Date()).toISOString();
      
      // Get shifts with current access code today
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, user_id, started_at')
        .eq('organization_id', organizationId)
        .eq('access_code_used', organization.daily_access_code)
        .gte('started_at', todayStart)
        .order('started_at', { ascending: false });

      if (shiftsError) throw shiftsError;
      if (!shifts || shifts.length === 0) return [];

      // Get profile details for each staff member
      const userIds = [...new Set(shifts.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return shifts.map(shift => {
        const profile = profileMap.get(shift.user_id);
        return {
          id: shift.id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || 'N/A',
          started_at: shift.started_at,
        };
      });
    },
    enabled: !!organizationId && !!organization?.daily_access_code,
  });

  const clockInCount = staffClockIns?.length || 0;

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
      queryClient.invalidateQueries({ queryKey: ['access-code-staff'] });
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
      queryClient.invalidateQueries({ queryKey: ['access-code-staff'] });
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
              <div className="flex items-center gap-2">
                {typeof clockInCount === 'number' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {clockInCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{clockInCount} staff clocked in with this code today</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Badge variant={isCodeSetToday ? "default" : "secondary"}>
                  {isCodeSetToday ? 'Set Today' : 'From Previous Day'}
                </Badge>
              </div>
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
                    <Check className="h-4 w-4 text-chart-2" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Staff Clock-In List */}
              {clockInCount > 0 && (
                <Collapsible open={showStaffList} onOpenChange={setShowStaffList}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {clockInCount} staff clocked in today
                      </span>
                      {showStaffList ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="max-h-48 mt-2">
                      <div className="space-y-2">
                        {staffClockIns?.map((staff) => (
                          <div
                            key={staff.id}
                            className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{staff.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(staff.started_at), 'h:mm a')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

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

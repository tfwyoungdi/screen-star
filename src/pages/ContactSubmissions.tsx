import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, MailOpen, Trash2, ExternalLink, Inbox, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function ContactSubmissions() {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['contact-submissions', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContactSubmission[];
    },
    enabled: !!organization?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      setSelectedMessage(null);
      toast.success('Message deleted');
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });

  const handleOpenMessage = (submission: ContactSubmission) => {
    setSelectedMessage(submission);
    if (!submission.is_read) {
      markAsReadMutation.mutate(submission.id);
    }
  };

  const unreadCount = submissions?.filter(s => !s.is_read).length || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contact Messages</h1>
            <p className="text-muted-foreground">
              View and manage messages from your website contact form
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
            </CardTitle>
            <CardDescription>
              {submissions?.length || 0} total messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions && submissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow 
                      key={submission.id}
                      className={`cursor-pointer hover:bg-muted/50 ${!submission.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => handleOpenMessage(submission)}
                    >
                      <TableCell>
                        {submission.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={!submission.is_read ? 'font-medium' : ''}>
                          {submission.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {submission.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={!submission.is_read ? 'font-medium' : ''}>
                          {submission.subject}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(submission.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`mailto:${submission.email}?subject=Re: ${submission.subject}`, '_blank')}
                            title="Reply via email"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(submission.id)}
                            title="Delete message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No messages yet</h3>
                <p className="text-muted-foreground text-sm">
                  Messages from your contact form will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Detail Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedMessage?.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <a 
                      href={`mailto:${selectedMessage?.email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedMessage?.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedMessage && format(new Date(selectedMessage.created_at), 'PPP p')}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {selectedMessage?.message}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => deleteMutation.mutate(selectedMessage!.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={() => window.open(`mailto:${selectedMessage?.email}?subject=Re: ${selectedMessage?.subject}`, '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

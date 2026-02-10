import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Platform', 'Setup', 'Features', 'Payments', 'Billing'];

function FAQFormDialog({ faq, onSave, trigger }: { faq?: FAQ; onSave: (data: Partial<FAQ>) => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [category, setCategory] = useState(faq?.category || 'Platform');
  const [displayOrder, setDisplayOrder] = useState(faq?.display_order?.toString() || '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    onSave({
      ...(faq?.id ? { id: faq.id } : {}),
      question: question.trim(),
      answer: answer.trim(),
      category,
      display_order: parseInt(displayOrder) || 0,
    });
    setOpen(false);
    if (!faq) {
      setQuestion('');
      setAnswer('');
      setCategory('Platform');
      setDisplayOrder('0');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && faq) {
        setQuestion(faq.question);
        setAnswer(faq.answer);
        setCategory(faq.category);
        setDisplayOrder(faq.display_order.toString());
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="How does..." />
          </div>
          <div className="space-y-2">
            <Label>Answer</Label>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Detailed answer..." rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{faq ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformFAQ() {
  const queryClient = useQueryClient();

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['platform-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_faqs')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (faq: Partial<FAQ>) => {
      const { error } = await supabase.from('platform_faqs').insert({
        question: faq.question!,
        answer: faq.answer!,
        category: faq.category!,
        display_order: faq.display_order!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-faqs'] });
      toast.success('FAQ created');
    },
    onError: () => toast.error('Failed to create FAQ'),
  });

  const updateMutation = useMutation({
    mutationFn: async (faq: Partial<FAQ>) => {
      const { id, ...rest } = faq;
      const { error } = await supabase.from('platform_faqs').update(rest).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-faqs'] });
      toast.success('FAQ updated');
    },
    onError: () => toast.error('Failed to update FAQ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-faqs'] });
      toast.success('FAQ deleted');
    },
    onError: () => toast.error('Failed to delete FAQ'),
  });

  const toggleActive = async (faq: FAQ) => {
    updateMutation.mutate({ id: faq.id, is_active: !faq.is_active });
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">FAQ Management</h1>
            <p className="text-muted-foreground">Manage the FAQ section on the landing page</p>
          </div>
          <FAQFormDialog
            onSave={(data) => createMutation.mutate(data)}
            trigger={<Button><Plus className="h-4 w-4 mr-2" /> Add FAQ</Button>}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No FAQs yet. Add your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <Card key={faq.id} className={cn(!faq.is_active && 'opacity-60')}>
                <CardContent className="flex items-start gap-4 py-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">{faq.question}</h3>
                      <Badge variant="secondary" className="flex-shrink-0">{faq.category}</Badge>
                      <Badge variant="outline" className="flex-shrink-0">#{faq.display_order}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={faq.is_active} onCheckedChange={() => toggleActive(faq)} />
                    <FAQFormDialog
                      faq={faq}
                      onSave={(data) => updateMutation.mutate(data)}
                      trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this FAQ?')) deleteMutation.mutate(faq.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}

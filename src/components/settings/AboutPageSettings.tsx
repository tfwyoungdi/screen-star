import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, Target, Heart, Star, Users } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface ValueItem {
  title: string;
  description: string;
  icon: string;
}

interface Organization {
  id: string;
  mission_text: string | null;
  values_json: ValueItem[] | null;
}

interface AboutPageSettingsProps {
  organization: Organization;
}

const aboutSchema = z.object({
  mission_text: z.string().optional(),
});

type AboutFormData = z.infer<typeof aboutSchema>;

const iconOptions = [
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'users', label: 'Community', icon: Users },
  { value: 'target', label: 'Target', icon: Target },
];

export function AboutPageSettings({ organization }: AboutPageSettingsProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<ValueItem[]>(
    Array.isArray(organization.values_json) ? organization.values_json : []
  );

  const {
    register,
    handleSubmit,
  } = useForm<AboutFormData>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      mission_text: organization.mission_text || '',
    },
  });

  const addValue = () => {
    setValues([...values, { title: '', description: '', icon: 'star' }]);
  };

  const removeValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, field: keyof ValueItem, value: string) => {
    const updated = [...values];
    updated[index] = { ...updated[index], [field]: value };
    setValues(updated);
  };

  const onSubmit = async (data: AboutFormData) => {
    setIsSubmitting(true);
    try {
      // Filter out empty values
      const filteredValues = values.filter(v => v.title.trim() && v.description.trim());
      
      const { error } = await supabase
        .from('organizations')
        .update({
          mission_text: data.mission_text || null,
          values_json: filteredValues as unknown as Json,
        })
        .eq('id', organization.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('About page content updated');
    } catch (error) {
      console.error('Error updating about page:', error);
      toast.error('Failed to update about page content');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Mission Statement
          </CardTitle>
          <CardDescription>
            Define your cinema's mission that will be displayed on the About page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mission_text">Mission Text</Label>
              <Textarea
                id="mission_text"
                {...register('mission_text')}
                placeholder="Our mission is to provide an exceptional cinema experience..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Describe your cinema's purpose and goals
              </p>
            </div>

            {/* Values Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Core Values</Label>
                  <p className="text-sm text-muted-foreground">
                    Add the values that define your cinema
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addValue}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Value
                </Button>
              </div>

              {values.length > 0 ? (
                <div className="space-y-4">
                  {values.map((value, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Value {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeValue(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Icon</Label>
                          <Select
                            value={value.icon}
                            onValueChange={(v) => updateValue(index, 'icon', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {iconOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="h-4 w-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={value.title}
                            onChange={(e) => updateValue(index, 'title', e.target.value)}
                            placeholder="e.g., Excellence"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={value.description}
                          onChange={(e) => updateValue(index, 'description', e.target.value)}
                          placeholder="Describe what this value means..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center">
                  <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No values added yet. Click "Add Value" to get started.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save About Page
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

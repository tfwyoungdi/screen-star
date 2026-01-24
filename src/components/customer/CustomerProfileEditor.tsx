import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Phone, Save, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CustomerProfileEditorProps {
  customerId: string;
  fullName: string;
  phone: string | null;
  email: string;
  primaryColor: string;
  onUpdate: () => void;
}

export function CustomerProfileEditor({
  customerId,
  fullName,
  phone,
  email,
  primaryColor,
  onUpdate,
}: CustomerProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: fullName,
      phone: phone || '',
    },
  });

  const handleSave = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .eq('id', customerId);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      full_name: fullName,
      phone: phone || '',
    });
    setIsEditing(false);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        placeholder="Enter your name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        placeholder="Enter your phone number"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <User className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Name</p>
                <p className="text-white font-medium">{fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Phone className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Phone</p>
                <p className="text-white font-medium">{phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <span className="text-white/60 text-sm">@</span>
              </div>
              <div>
                <p className="text-white/40 text-xs">Email</p>
                <p className="text-white font-medium">{email}</p>
                <p className="text-white/40 text-xs mt-0.5">Email cannot be changed</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, User, Mail, Phone, FileText } from 'lucide-react';

const applicationSchema = z.object({
  applicant_name: z.string().min(2, 'Name must be at least 2 characters'),
  applicant_email: z.string().email('Please enter a valid email'),
  applicant_phone: z.string().optional(),
  cover_letter: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface JobApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  organizationId: string;
  primaryColor: string;
}

export function JobApplicationForm({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  organizationId,
  primaryColor,
}: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('job_applications').insert({
        job_id: jobId,
        organization_id: organizationId,
        applicant_name: data.applicant_name,
        applicant_email: data.applicant_email,
        applicant_phone: data.applicant_phone || null,
        cover_letter: data.cover_letter || null,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setIsSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Apply for {jobTitle}
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor }} />
            <h3 className="text-lg font-semibold mb-2">Application Submitted!</h3>
            <p className="text-white/60 mb-6">
              Thank you for your interest. We'll review your application and get back to you soon.
            </p>
            <Button
              onClick={handleClose}
              style={{ backgroundColor: primaryColor }}
              className="hover:opacity-90"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="applicant_name" className="text-white/80 flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="applicant_name"
                {...register('applicant_name')}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="John Doe"
              />
              {errors.applicant_name && (
                <p className="text-red-400 text-sm">{errors.applicant_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicant_email" className="text-white/80 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="applicant_email"
                type="email"
                {...register('applicant_email')}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="john@example.com"
              />
              {errors.applicant_email && (
                <p className="text-red-400 text-sm">{errors.applicant_email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicant_phone" className="text-white/80 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="applicant_phone"
                type="tel"
                {...register('applicant_phone')}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover_letter" className="text-white/80 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Cover Letter
              </Label>
              <Textarea
                id="cover_letter"
                {...register('cover_letter')}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[120px]"
                placeholder="Tell us why you'd be a great fit for this role..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: primaryColor }}
                className="flex-1 hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

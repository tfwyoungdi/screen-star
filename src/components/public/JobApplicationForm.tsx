import { useState, useRef } from 'react';
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
import { Loader2, CheckCircle2, User, Mail, Phone, FileText, Upload, X } from 'lucide-react';

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
  cinemaName: string;
  primaryColor: string;
}

export function JobApplicationForm({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  organizationId,
  cinemaName,
  primaryColor,
}: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setResumeFile(file);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let resumeUrl: string | null = null;

      // Upload resume if provided
      if (resumeFile) {
        setUploadProgress(20);
        const fileExt = resumeFile.name.split('.').pop();
        const fileName = `${organizationId}/${jobId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, resumeFile);

        if (uploadError) {
          console.error('Resume upload error:', uploadError);
          throw new Error('Failed to upload resume');
        }
        
        resumeUrl = fileName;
        setUploadProgress(50);
      }

      // Insert application
      const { error } = await supabase.from('job_applications').insert({
        job_id: jobId,
        organization_id: organizationId,
        applicant_name: data.applicant_name,
        applicant_email: data.applicant_email,
        applicant_phone: data.applicant_phone || null,
        cover_letter: data.cover_letter || null,
        resume_url: resumeUrl,
      });

      if (error) throw error;
      setUploadProgress(75);

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-application-confirmation', {
          body: {
            applicantName: data.applicant_name,
            applicantEmail: data.applicant_email,
            jobTitle,
            cinemaName,
            primaryColor,
          },
        });
      } catch (emailError) {
        // Don't fail the submission if email fails
        console.error('Failed to send confirmation email:', emailError);
      }

      setUploadProgress(100);
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
    setResumeFile(null);
    setIsSubmitted(false);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
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
              Thank you for your interest. We've sent a confirmation to your email. 
              We'll review your application and get back to you soon.
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

            {/* Resume Upload */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Resume/CV
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {resumeFile ? (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <FileText className="h-8 w-8 text-white/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{resumeFile.name}</p>
                    <p className="text-xs text-white/40">
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed border-white/20 text-white/60 hover:text-white hover:bg-white/5"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume (PDF, DOC, DOCX - Max 5MB)
                </Button>
              )}
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

            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, backgroundColor: primaryColor }}
                  />
                </div>
                <p className="text-xs text-white/40 text-center">
                  {uploadProgress < 50 ? 'Uploading resume...' : 
                   uploadProgress < 75 ? 'Submitting application...' : 
                   'Sending confirmation...'}
                </p>
              </div>
            )}

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

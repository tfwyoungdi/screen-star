import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CinemaHeader } from '@/components/public/CinemaHeader';
import { JobApplicationForm } from '@/components/public/JobApplicationForm';
import { Film, ArrowLeft, Briefcase, MapPin, Clock, Mail } from 'lucide-react';

interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  contact_email: string | null;
}

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string | null;
}

const getDepartmentColor = (department: string) => {
  const colors: Record<string, string> = {
    'Operations': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Customer Service': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Technical': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Management': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Marketing': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  };
  return colors[department] || 'bg-white/10 text-white/70 border-white/20';
};

export default function CinemaCareers() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: cinema, isLoading: cinemaLoading } = useQuery({
    queryKey: ['public-cinema-careers', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, contact_email')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as CinemaData | null;
    },
    enabled: !!slug,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['public-cinema-jobs', cinema?.id],
    queryFn: async () => {
      if (!cinema?.id) return [];
      const { data, error } = await supabase
        .from('cinema_jobs')
        .select('*')
        .eq('organization_id', cinema.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!cinema?.id,
  });

  const isLoading = cinemaLoading || jobsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cinema) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center">
          <Film className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Cinema Not Found</h1>
          <p className="text-white/60 mb-6">The cinema you're looking for doesn't exist.</p>
          <Button asChild>
            <a href="/">Go to Homepage</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <CinemaHeader
        slug={slug!}
        cinemaName={cinema.name}
        logoUrl={cinema.logo_url}
        primaryColor={cinema.primary_color}
        currentPage="careers"
      />

      {/* Hero Section */}
      <section className="py-20 border-b border-white/10">
        <div className="container mx-auto px-4 text-center">
          <Link 
            to={`/cinema/${slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Movies
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join Our Team
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Be part of the magic at {cinema.name}. We're always looking for passionate people to join our team.
          </p>
        </div>
      </section>

      {/* Jobs List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div 
                    key={job.id}
                    className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <Badge variant="outline" className={getDepartmentColor(job.department)}>
                            {job.department}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.type}
                          </span>
                        </div>
                        {job.description && (
                          <p className="mt-3 text-sm text-white/50">{job.description}</p>
                        )}
                      </div>
                      <Button 
                        onClick={() => setSelectedJob(job)}
                        style={{ backgroundColor: cinema.primary_color }}
                        className="hover:opacity-90 shrink-0"
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Briefcase className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No Open Positions</h2>
                <p className="text-white/60 mb-6">
                  We don't have any open positions at the moment, but check back soon!
                </p>
                {cinema.contact_email && (
                  <Button 
                    asChild
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <a href={`mailto:${cinema.contact_email}?subject=General Application`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Your Resume
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {cinema.name}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Application Form Modal */}
      {selectedJob && (
        <JobApplicationForm
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          organizationId={cinema.id}
          cinemaName={cinema.name}
          primaryColor={cinema.primary_color}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sparkles, Film, Calendar, Users, BarChart3, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Your Dashboard',
    description: 'This is your command center. Get a quick overview of revenue, ticket sales, and upcoming shows all in one place.',
    icon: Sparkles,
    position: 'bottom',
  },
  {
    target: '[data-tour="movies"]',
    title: 'Manage Your Movies',
    description: 'Add new movies, upload posters, and embed trailers. Keep your catalog up to date for your customers.',
    icon: Film,
    position: 'right',
  },
  {
    target: '[data-tour="showtimes"]',
    title: 'Schedule Showtimes',
    description: 'Create and manage screening times for all your movies across different screens.',
    icon: Calendar,
    position: 'right',
  },
  {
    target: '[data-tour="staff"]',
    title: 'Team Management',
    description: 'Invite staff members with specific roles like box office, gate staff, or managers.',
    icon: Users,
    position: 'right',
  },
  {
    target: '[data-tour="sales"]',
    title: 'Track Your Revenue',
    description: 'View detailed analytics, sales reports, and performance metrics for your cinema.',
    icon: BarChart3,
    position: 'right',
  },
  {
    target: '[data-tour="settings"]',
    title: 'Configure Your Cinema',
    description: 'Set up your cinema profile, payment methods, and customize your public booking page.',
    icon: Settings,
    position: 'right',
  },
];

interface WelcomeTourProps {
  onComplete: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('cinetix_tour_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Step {currentStep + 1} of {tourSteps.length}
                  </p>
                  <h2 className="text-xl font-bold text-foreground">{step.title}</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step indicators */}
          <div className="px-6 pb-4">
            <div className="flex justify-center gap-1.5">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    index === currentStep
                      ? 'w-6 bg-primary'
                      : index < currentStep
                        ? 'w-2 bg-primary/50'
                        : 'w-2 bg-secondary'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-2 flex items-center justify-between gap-3 border-t border-border bg-secondary/30">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="gap-1.5">
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    <Check className="h-4 w-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('cinetix_tour_completed');
    if (!tourCompleted) {
      // Delay showing tour to let the dashboard render first
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetTour = () => {
    localStorage.removeItem('cinetix_tour_completed');
    setShowTour(true);
  };

  return { showTour, setShowTour, resetTour };
}

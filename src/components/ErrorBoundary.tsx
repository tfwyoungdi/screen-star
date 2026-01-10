import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with full details
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    console.error('🚨 Error Boundary Caught Error:', errorLog);
    console.error('📍 Component Stack:', errorInfo.componentStack);
    console.error('📚 Full Stack Trace:', error.stack);

    this.setState({ errorInfo });

    // Store in sessionStorage for potential recovery/debugging
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorLog);
      // Keep only last 10 errors
      if (existingErrors.length > 10) existingErrors.shift();
      sessionStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch (e) {
      // Ignore storage errors
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message}
URL: ${window.location.href}
Time: ${new Date().toISOString()}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      toast.success('Error details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy error details');
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-base">
                We're sorry, but an unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error summary */}
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                <p className="text-sm font-medium text-destructive">
                  {error?.message || 'Unknown error'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                  <Home className="h-4 w-4" />
                  Go to Home
                </Button>
                <Button variant="outline" onClick={this.handleCopyError} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Error
                </Button>
              </div>

              {/* Technical details (collapsible) */}
              <div className="pt-4 border-t">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Technical Details
                </button>

                {showDetails && (
                  <div className="mt-4 space-y-4">
                    {/* Stack trace */}
                    {error?.stack && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Stack Trace:</p>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap break-words">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component stack */}
                    {errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Component Stack:</p>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap break-words">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Context info */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Context:</p>
                      <div className="text-xs bg-muted p-3 rounded-lg space-y-1">
                        <p><span className="text-muted-foreground">URL:</span> {window.location.href}</p>
                        <p><span className="text-muted-foreground">Time:</span> {new Date().toISOString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for async error handling
export function useAsyncErrorHandler() {
  const handleAsyncError = (error: Error, context?: string) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
    };

    console.error('🚨 Async Error:', errorLog);

    // Store for debugging
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorLog);
      if (existingErrors.length > 10) existingErrors.shift();
      sessionStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch (e) {
      // Ignore storage errors
    }

    toast.error(`Error: ${error.message}`, {
      description: context || 'An unexpected error occurred',
      action: {
        label: 'Copy details',
        onClick: () => {
          navigator.clipboard.writeText(JSON.stringify(errorLog, null, 2));
          toast.success('Error details copied');
        },
      },
    });
  };

  return { handleAsyncError };
}

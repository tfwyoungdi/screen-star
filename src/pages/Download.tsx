import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Apple, Download as DownloadIcon, CheckCircle, Shield, Zap } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type OS = "windows" | "mac" | "unknown";

const detectOS = (): OS => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  if (platform.includes("mac") || userAgent.includes("mac")) {
    return "mac";
  }
  if (platform.includes("win") || userAgent.includes("win")) {
    return "windows";
  }
  return "unknown";
};

const DownloadPage = () => {
  const [detectedOS, setDetectedOS] = useState<OS>("unknown");

  useEffect(() => {
    setDetectedOS(detectOS());
  }, []);

  const downloads = [
    {
      os: "windows" as OS,
      name: "Windows",
      icon: Monitor,
      version: "1.0.0",
      size: "85 MB",
      requirements: "Windows 10 or later",
      downloadUrl: "#", // Replace with actual download URL
    },
    {
      os: "mac" as OS,
      name: "macOS",
      icon: Apple,
      version: "1.0.0",
      size: "92 MB",
      requirements: "macOS 11 (Big Sur) or later",
      downloadUrl: "#", // Replace with actual download URL
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Fast Ticket Sales",
      description: "Optimized for high-volume counter operations",
    },
    {
      icon: Shield,
      title: "Secure Access",
      description: "Daily access codes and shift-based authentication",
    },
    {
      icon: CheckCircle,
      title: "Multi-Cinema Ready",
      description: "Enter your cinema code once, auto-connect every time",
    },
  ];

  // Sort downloads so detected OS comes first
  const sortedDownloads = [...downloads].sort((a, b) => {
    if (a.os === detectedOS) return -1;
    if (b.os === detectedOS) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Desktop App for Staff
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Download Box Office
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The dedicated desktop application for cinema box office staff. Fast, secure, and designed for high-volume ticket sales at the counter.
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {sortedDownloads.map((download) => {
            const Icon = download.icon;
            const isRecommended = download.os === detectedOS;

            return (
              <Card
                key={download.os}
                className={`relative transition-all ${
                  isRecommended
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
              >
                {isRecommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Recommended for you
                  </Badge>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                    <Icon className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{download.name}</CardTitle>
                  <CardDescription>Version {download.version}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>File size: {download.size}</p>
                    <p>{download.requirements}</p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    variant={isRecommended ? "default" : "outline"}
                    asChild
                  >
                    <a href={download.downloadUrl}>
                      <DownloadIcon className="mr-2 h-5 w-5" />
                      Download for {download.name}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Why use the desktop app?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ol className="text-left space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              Download the app for your operating system
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              Install and launch the application
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              Enter your cinema's unique code (provided by your admin)
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              Log in with your staff credentials and start selling!
            </li>
          </ol>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DownloadPage;

import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { PlatformEmailAnalytics } from '@/components/platform-admin/PlatformEmailAnalytics';
import { BulkAnnouncementSender } from '@/components/platform-admin/BulkAnnouncementSender';

export default function PlatformCommunications() {
  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage platform emails and announcements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PlatformEmailAnalytics />
          </div>
          <div>
            <BulkAnnouncementSender />
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}

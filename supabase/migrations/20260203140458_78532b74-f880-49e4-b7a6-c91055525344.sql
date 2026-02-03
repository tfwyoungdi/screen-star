-- Add new platform-level roles to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_marketing';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_accounts';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_dev';
-- Add reminder_sent column to bookings table for tracking showtime reminders
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying of bookings that need reminders
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent 
ON public.bookings (reminder_sent, status) 
WHERE status = 'paid' AND reminder_sent = false;
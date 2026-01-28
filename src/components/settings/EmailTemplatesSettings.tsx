import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, FileText, Save, RotateCcw, Eye, Code, Blocks, Ticket, Bell, Send, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmailBlockEditor, EmailBlock, blocksToHtml } from "./EmailBlockEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmailAnalyticsWidget from "./EmailAnalyticsWidget";

interface EmailTemplate {
  id?: string;
  organization_id: string;
  template_type: string;
  subject: string;
  html_body: string;
  is_active: boolean;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; html_body: string; defaultBlocks: EmailBlock[] }> = {
  application_confirmation: {
    subject: "Thank You for Your Application - {{cinema_name}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 28px; text-align: center;">🎬 Application Received!</h1>
    <p style="color: #f5f5f0; font-size: 16px; line-height: 1.6;">Dear {{applicant_name}},</p>
    <p style="color: #888; font-size: 14px; line-height: 1.6;">Thank you for applying for the <strong style="color: #D4AF37;">{{job_title}}</strong> position at {{cinema_name}}.</p>
    <p style="color: #888; font-size: 14px; line-height: 1.6;">We have received your application and will review it carefully. If your qualifications match our requirements, we will contact you to schedule an interview.</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #888; font-size: 12px; margin: 0;">Application Reference</p>
      <p style="color: #D4AF37; font-size: 18px; font-weight: bold; margin: 5px 0 0 0;">{{job_title}} - {{department}}</p>
    </div>
    <p style="color: #888; font-size: 14px; line-height: 1.6;">Best regards,<br><strong style="color: #f5f5f0;">The {{cinema_name}} Team</strong></p>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>`,
    defaultBlocks: [
      { id: "1", type: "heading", content: "🎬 Application Received!", styles: { color: "#D4AF37", textAlign: "center", fontSize: "28px" } },
      { id: "2", type: "text", content: "Dear {{applicant_name}},", styles: { color: "#f5f5f0", fontSize: "16px" } },
      { id: "3", type: "text", content: "Thank you for applying for the {{job_title}} position at {{cinema_name}}. We have received your application and will review it carefully.", styles: { color: "#888888", fontSize: "14px" } },
      { id: "4", type: "table-row", content: "", styles: {}, tableData: [{ label: "Position", value: "{{job_title}}" }] },
      { id: "5", type: "table-row", content: "", styles: {}, tableData: [{ label: "Department", value: "{{department}}" }] },
      { id: "6", type: "text", content: "Best regards,\nThe {{cinema_name}} Team", styles: { color: "#888888", fontSize: "14px" } },
    ],
  },
  contact_notification: {
    subject: "New Contact Form Submission: {{subject}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 28px; text-align: center;">📬 New Contact Message</h1>
    <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 30px;">You've received a new message from your cinema's contact form.</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">From</td><td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right;">{{sender_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Email</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right;">{{sender_email}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Subject</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right; font-weight: bold;">{{subject}}</td></tr>
      </table>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Message</p>
      <p style="color: #f5f5f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{{message}}</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="mailto:{{sender_email}}?subject=Re: {{subject}}" style="display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reply to {{sender_name}}</a>
    </div>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">This notification was sent from the {{cinema_name}} contact form.</p>
  </div>
</body>
</html>`,
    defaultBlocks: [
      { id: "1", type: "heading", content: "📬 New Contact Message", styles: { color: "#D4AF37", textAlign: "center", fontSize: "28px" } },
      { id: "2", type: "text", content: "You've received a new message from your cinema's contact form.", styles: { color: "#888888", fontSize: "14px", textAlign: "center" } },
      { id: "3", type: "table-row", content: "", styles: {}, tableData: [{ label: "From", value: "{{sender_name}}" }] },
      { id: "4", type: "table-row", content: "", styles: {}, tableData: [{ label: "Email", value: "{{sender_email}}" }] },
      { id: "5", type: "table-row", content: "", styles: {}, tableData: [{ label: "Subject", value: "{{subject}}" }] },
      { id: "6", type: "divider", content: "", styles: {} },
      { id: "7", type: "text", content: "{{message}}", styles: { color: "#f5f5f0", fontSize: "14px" } },
      { id: "8", type: "button", content: "Reply to {{sender_name}}", styles: { backgroundColor: "#D4AF37", color: "#000000" } },
    ],
  },
  booking_confirmation: {
    subject: "Your Booking Confirmation - {{movie_title}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 28px; text-align: center;">🎬 Booking Confirmed!</h1>
    <p style="color: #f5f5f0; font-size: 16px; text-align: center;">Hi {{customer_name}}, your booking is confirmed!</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="color: #D4AF37; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase;">Your Ticket QR Code</p>
      <img src="{{qr_code_url}}" alt="Booking QR Code" style="width: 180px; height: 180px; margin: 0 auto; display: block; border-radius: 8px; background: white; padding: 10px;" />
      <p style="color: #888; font-size: 12px; margin: 15px 0 0 0;">Scan this code at the entrance</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #D4AF37; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Booking Reference</p>
      <p style="color: #f5f5f0; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">{{booking_reference}}</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Cinema</td><td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right;">{{cinema_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Movie</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right; font-weight: bold;">{{movie_title}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date & Time</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{showtime}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{screen_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">{{seats}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Total Paid</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #22c55e; font-size: 18px; text-align: right; font-weight: bold;">{{total_amount}}</td></tr>
      </table>
    </div>
    <p style="color: #888; font-size: 14px; text-align: center; line-height: 1.6;">Please arrive at least 15 minutes before the showtime. Present your QR code at the entrance.</p>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">Thank you for booking with {{cinema_name}}. Enjoy your movie!</p>
  </div>
</body>
</html>`,
    defaultBlocks: [
      { id: "1", type: "heading", content: "🎬 Booking Confirmed!", styles: { color: "#D4AF37", textAlign: "center", fontSize: "28px" } },
      { id: "2", type: "text", content: "Hi {{customer_name}}, your booking is confirmed!", styles: { color: "#f5f5f0", fontSize: "16px", textAlign: "center" } },
      { id: "3", type: "image", content: "{{qr_code_url}}", styles: { textAlign: "center" } },
      { id: "4", type: "text", content: "Scan this QR code at the entrance", styles: { color: "#888888", fontSize: "12px", textAlign: "center" } },
      { id: "5", type: "heading", content: "{{booking_reference}}", styles: { color: "#f5f5f0", textAlign: "center", fontSize: "24px" } },
      { id: "6", type: "table-row", content: "", styles: {}, tableData: [{ label: "Cinema", value: "{{cinema_name}}" }] },
      { id: "7", type: "table-row", content: "", styles: {}, tableData: [{ label: "Movie", value: "{{movie_title}}" }] },
      { id: "8", type: "table-row", content: "", styles: {}, tableData: [{ label: "Date & Time", value: "{{showtime}}" }] },
      { id: "9", type: "table-row", content: "", styles: {}, tableData: [{ label: "Screen", value: "{{screen_name}}" }] },
      { id: "10", type: "table-row", content: "", styles: {}, tableData: [{ label: "Seats", value: "{{seats}}" }] },
      { id: "11", type: "table-row", content: "", styles: {}, tableData: [{ label: "Total Paid", value: "{{total_amount}}" }] },
      { id: "12", type: "divider", content: "", styles: {} },
      { id: "13", type: "text", content: "Please arrive at least 15 minutes before the showtime. Present your QR code at the entrance.", styles: { color: "#888888", fontSize: "14px", textAlign: "center" } },
    ],
  },
  showtime_reminder: {
    subject: "⏰ Reminder: {{movie_title}} starts in {{hours_until}} hours!",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 28px; text-align: center;">⏰ Your Movie Starts Soon!</h1>
    <p style="color: #D4AF37; font-size: 18px; text-align: center; margin-bottom: 30px;">In approximately {{hours_until}} hours</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #D4AF37; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Booking Reference</p>
      <p style="color: #f5f5f0; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">{{booking_reference}}</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Movie</td><td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right; font-weight: bold;">{{movie_title}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{showtime_date}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Time</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">{{showtime_time}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{screen_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">{{seats}}</td></tr>
      </table>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #888; font-size: 14px; margin: 0 0 5px 0;">📍 Location</p>
      <p style="color: #f5f5f0; font-size: 16px; margin: 0; font-weight: bold;">{{cinema_name}}</p>
      <p style="color: #888; font-size: 14px; margin: 5px 0 0 0;">{{cinema_address}}</p>
    </div>
    <div style="background-color: #D4AF37; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #0a0a0a; font-size: 14px; margin: 0; font-weight: bold; text-align: center;">💡 Pro tip: Arrive 15-20 minutes early to grab snacks and find your seats!</p>
    </div>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">We're excited to have you! Enjoy your movie experience.</p>
  </div>
</body>
</html>`,
    defaultBlocks: [
      { id: "1", type: "heading", content: "⏰ Your Movie Starts Soon!", styles: { color: "#D4AF37", textAlign: "center", fontSize: "28px" } },
      { id: "2", type: "text", content: "In approximately {{hours_until}} hours", styles: { color: "#D4AF37", fontSize: "18px", textAlign: "center" } },
      { id: "3", type: "heading", content: "{{booking_reference}}", styles: { color: "#f5f5f0", textAlign: "center", fontSize: "24px" } },
      { id: "4", type: "table-row", content: "", styles: {}, tableData: [{ label: "Movie", value: "{{movie_title}}" }] },
      { id: "5", type: "table-row", content: "", styles: {}, tableData: [{ label: "Date", value: "{{showtime_date}}" }] },
      { id: "6", type: "table-row", content: "", styles: {}, tableData: [{ label: "Time", value: "{{showtime_time}}" }] },
      { id: "7", type: "table-row", content: "", styles: {}, tableData: [{ label: "Screen", value: "{{screen_name}}" }] },
      { id: "8", type: "table-row", content: "", styles: {}, tableData: [{ label: "Seats", value: "{{seats}}" }] },
      { id: "9", type: "divider", content: "", styles: {} },
      { id: "10", type: "text", content: "📍 {{cinema_name}}\n{{cinema_address}}", styles: { color: "#f5f5f0", fontSize: "14px" } },
      { id: "11", type: "text", content: "💡 Pro tip: Arrive 15-20 minutes early to grab snacks and find your seats!", styles: { color: "#0a0a0a", fontSize: "14px", backgroundColor: "#D4AF37" } },
    ],
  },
  cancellation_confirmation: {
    subject: "Booking Cancellation Confirmation - {{booking_reference}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #ef4444; margin: 0 0 20px 0; font-size: 28px; text-align: center;">🎬 Booking Cancelled</h1>
    <p style="color: #f5f5f0; font-size: 16px; text-align: center;">Hi {{customer_name}}, your booking has been cancelled.</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #888; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Cancelled Booking Reference</p>
      <p style="color: #ef4444; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px; text-decoration: line-through;">{{booking_reference}}</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Cinema</td><td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right;">{{cinema_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Movie</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{movie_title}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date & Time</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{showtime}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{screen_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px; text-align: right; text-decoration: line-through;">{{seats}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Refund Amount</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #22c55e; font-size: 18px; text-align: right; font-weight: bold;">{{refund_amount}}</td></tr>
      </table>
    </div>
    <div style="background-color: #22c55e20; border: 1px solid #22c55e40; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="color: #22c55e; font-size: 14px; margin: 0; text-align: center;">💰 Your refund of {{refund_amount}} will be processed within 5-10 business days.</p>
    </div>
    <p style="color: #888; font-size: 14px; text-align: center; line-height: 1.6;">If you have any questions about your refund, please contact us.</p>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">We hope to see you again soon at {{cinema_name}}!</p>
  </div>
</body>
</html>`,
    defaultBlocks: [
      { id: "1", type: "heading", content: "🎬 Booking Cancelled", styles: { color: "#ef4444", textAlign: "center", fontSize: "28px" } },
      { id: "2", type: "text", content: "Hi {{customer_name}}, your booking has been cancelled.", styles: { color: "#f5f5f0", fontSize: "16px", textAlign: "center" } },
      { id: "3", type: "heading", content: "{{booking_reference}}", styles: { color: "#ef4444", textAlign: "center", fontSize: "24px" } },
      { id: "4", type: "table-row", content: "", styles: {}, tableData: [{ label: "Cinema", value: "{{cinema_name}}" }] },
      { id: "5", type: "table-row", content: "", styles: {}, tableData: [{ label: "Movie", value: "{{movie_title}}" }] },
      { id: "6", type: "table-row", content: "", styles: {}, tableData: [{ label: "Date & Time", value: "{{showtime}}" }] },
      { id: "7", type: "table-row", content: "", styles: {}, tableData: [{ label: "Screen", value: "{{screen_name}}" }] },
      { id: "8", type: "table-row", content: "", styles: {}, tableData: [{ label: "Seats", value: "{{seats}}" }] },
      { id: "9", type: "table-row", content: "", styles: {}, tableData: [{ label: "Refund Amount", value: "{{refund_amount}}" }] },
      { id: "10", type: "divider", content: "", styles: {} },
      { id: "11", type: "text", content: "💰 Your refund will be processed within 5-10 business days.", styles: { color: "#22c55e", fontSize: "14px", textAlign: "center" } },
      { id: "12", type: "text", content: "We hope to see you again soon!", styles: { color: "#888888", fontSize: "14px", textAlign: "center" } },
    ],
  },
};

const TEMPLATE_INFO: Record<string, { name: string; description: string; icon: any; variables: string[] }> = {
  application_confirmation: {
    name: "Application Confirmation",
    description: "Sent to applicants when they submit a job application",
    icon: FileText,
    variables: ["{{applicant_name}}", "{{job_title}}", "{{department}}", "{{cinema_name}}"],
  },
  contact_notification: {
    name: "Contact Notification",
    description: "Sent to admin when someone submits the contact form",
    icon: Mail,
    variables: ["{{sender_name}}", "{{sender_email}}", "{{subject}}", "{{message}}", "{{cinema_name}}"],
  },
  booking_confirmation: {
    name: "Booking Confirmation",
    description: "Sent to customers when their booking is confirmed",
    icon: Ticket,
    variables: ["{{customer_name}}", "{{booking_reference}}", "{{movie_title}}", "{{showtime}}", "{{screen_name}}", "{{seats}}", "{{total_amount}}", "{{cinema_name}}", "{{qr_code_url}}"],
  },
  showtime_reminder: {
    name: "Showtime Reminder",
    description: "Sent to customers 2-3 hours before their showtime",
    icon: Bell,
    variables: ["{{customer_name}}", "{{booking_reference}}", "{{movie_title}}", "{{showtime_date}}", "{{showtime_time}}", "{{screen_name}}", "{{seats}}", "{{hours_until}}", "{{cinema_name}}", "{{cinema_address}}"],
  },
  cancellation_confirmation: {
    name: "Cancellation Confirmation",
    description: "Sent when a booking is cancelled or refunded",
    icon: XCircle,
    variables: ["{{customer_name}}", "{{booking_reference}}", "{{movie_title}}", "{{showtime}}", "{{screen_name}}", "{{seats}}", "{{refund_amount}}", "{{cinema_name}}"],
  },
};

export default function EmailTemplatesSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("booking_confirmation");
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [blocks, setBlocks] = useState<Record<string, EmailBlock[]>>({});
  const [editorMode, setEditorMode] = useState<Record<string, "visual" | "code">>({});
  const [previewHtml, setPreviewHtml] = useState("");
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const { data: organization } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      return data;
    },
    enabled: !!user,
  });

  const { data: savedTemplates, isLoading } = useQuery({
    queryKey: ["email-templates", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("organization_id", organization!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  useEffect(() => {
    if (organization?.id) {
      const templateMap: Record<string, EmailTemplate> = {};
      const blockMap: Record<string, EmailBlock[]> = {};
      const modeMap: Record<string, "visual" | "code"> = {};
      
      Object.keys(DEFAULT_TEMPLATES).forEach((type) => {
        const saved = savedTemplates?.find((t) => t.template_type === type);
        if (saved) {
          templateMap[type] = saved as EmailTemplate;
        } else {
          templateMap[type] = {
            organization_id: organization.id,
            template_type: type,
            subject: DEFAULT_TEMPLATES[type].subject,
            html_body: DEFAULT_TEMPLATES[type].html_body,
            is_active: true,
          };
        }
        blockMap[type] = [...DEFAULT_TEMPLATES[type].defaultBlocks];
        modeMap[type] = "visual";
      });
      
      setTemplates(templateMap);
      setBlocks(blockMap);
      setEditorMode(modeMap);
    }
  }, [organization?.id, savedTemplates]);

  const saveMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      if (template.id) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: template.subject,
            html_body: template.html_body,
            is_active: template.is_active,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          organization_id: template.organization_id,
          template_type: template.template_type,
          subject: template.subject,
          html_body: template.html_body,
          is_active: template.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const handleTemplateChange = (type: string, field: keyof EmailTemplate, value: string | boolean) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleBlocksChange = (type: string, newBlocks: EmailBlock[]) => {
    setBlocks((prev) => ({ ...prev, [type]: newBlocks }));
    // Auto-update HTML when blocks change
    const html = blocksToHtml(newBlocks);
    handleTemplateChange(type, "html_body", html);
  };

  const handleSave = (type: string) => {
    // If in visual mode, generate HTML from blocks
    if (editorMode[type] === "visual") {
      const html = blocksToHtml(blocks[type] || []);
      const updatedTemplate = { ...templates[type], html_body: html };
      saveMutation.mutate(updatedTemplate);
    } else {
      saveMutation.mutate(templates[type]);
    }
  };

  const handleReset = (type: string) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        subject: DEFAULT_TEMPLATES[type].subject,
        html_body: DEFAULT_TEMPLATES[type].html_body,
      },
    }));
    setBlocks((prev) => ({
      ...prev,
      [type]: [...DEFAULT_TEMPLATES[type].defaultBlocks],
    }));
    toast.info("Template reset to default");
  };

  const getSampleData = (): Record<string, string> => ({
    "{{applicant_name}}": "John Doe",
    "{{job_title}}": "Cinema Attendant",
    "{{department}}": "Operations",
    "{{cinema_name}}": organization?.name || "Cinema Name",
    "{{sender_name}}": "Jane Smith",
    "{{sender_email}}": "jane@example.com",
    "{{subject}}": "Question about showtimes",
    "{{message}}": "Hello, I wanted to ask about the showtimes for this weekend.",
    "{{customer_name}}": "John Doe",
    "{{booking_reference}}": "ABC12345",
    "{{movie_title}}": "Interstellar",
    "{{showtime}}": "Saturday, Jan 15, 2025 at 7:30 PM",
    "{{showtime_date}}": "Saturday, January 15, 2025",
    "{{showtime_time}}": "7:30 PM",
    "{{screen_name}}": "Screen 1",
    "{{seats}}": "A1, A2, A3",
    "{{total_amount}}": "$45.00",
    "{{hours_until}}": "2",
    "{{cinema_address}}": organization?.address || "123 Main St, City, State 12345",
    "{{qr_code_url}}": "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=TEST-ABC12345",
  });

  const generatePreview = (type: string) => {
    let html = editorMode[type] === "visual" 
      ? blocksToHtml(blocks[type] || [])
      : templates[type]?.html_body || "";
      
    const sampleData = getSampleData();

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });

    setPreviewHtml(html);
  };

  const handleSendTestEmail = async (type: string) => {
    if (!user?.email) {
      toast.error("No email address found for your account");
      return;
    }

    setSendingTest(type);
    
    try {
      let html = editorMode[type] === "visual" 
        ? blocksToHtml(blocks[type] || [])
        : templates[type]?.html_body || "";
      
      let subject = templates[type]?.subject || "";
      const sampleData = getSampleData();

      Object.entries(sampleData).forEach(([key, value]) => {
        html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
        subject = subject.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
      });

      const { error } = await supabase.functions.invoke("send-test-email", {
        body: {
          to: user.email,
          subject: `[TEST] ${subject}`,
          html,
        },
      });

      if (error) throw error;
      
      toast.success(`Test email sent to ${user.email}`);
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      toast.error("Failed to send test email: " + error.message);
    } finally {
      setSendingTest(null);
    }
  };

  const toggleEditorMode = (type: string) => {
    const newMode = editorMode[type] === "visual" ? "code" : "visual";
    setEditorMode((prev) => ({ ...prev, [type]: newMode }));
  };

  if (isLoading || !organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Templates
        </CardTitle>
        <CardDescription>
          Customize email templates with the visual editor or raw HTML. Use variables like {"{{customer_name}}"} to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="booking_confirmation" className="text-xs sm:text-sm">
              <Ticket className="h-4 w-4 mr-1 hidden sm:inline" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="showtime_reminder" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 mr-1 hidden sm:inline" />
              Reminder
            </TabsTrigger>
            <TabsTrigger value="cancellation_confirmation" className="text-xs sm:text-sm">
              <XCircle className="h-4 w-4 mr-1 hidden sm:inline" />
              Cancel
            </TabsTrigger>
            <TabsTrigger value="application_confirmation" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="contact_notification" className="text-xs sm:text-sm">
              <Mail className="h-4 w-4 mr-1 hidden sm:inline" />
              Contact
            </TabsTrigger>
          </TabsList>

          {Object.entries(TEMPLATE_INFO).map(([type, info]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{info.name}</h4>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${type}-active`} className="text-sm">Active</Label>
                    <Switch
                      id={`${type}-active`}
                      checked={templates[type]?.is_active ?? true}
                      onCheckedChange={(checked) => handleTemplateChange(type, "is_active", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-subject`}>Email Subject</Label>
                <Input
                  id={`${type}-subject`}
                  value={templates[type]?.subject || ""}
                  onChange={(e) => handleTemplateChange(type, "subject", e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Editor Mode Toggle */}
              <div className="flex items-center gap-2 border-b pb-2">
                <Button
                  type="button"
                  variant={editorMode[type] === "visual" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setEditorMode((prev) => ({ ...prev, [type]: "visual" }))}
                >
                  <Blocks className="h-4 w-4 mr-1" />
                  Visual Editor
                </Button>
                <Button
                  type="button"
                  variant={editorMode[type] === "code" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setEditorMode((prev) => ({ ...prev, [type]: "code" }))}
                >
                  <Code className="h-4 w-4 mr-1" />
                  HTML Code
                </Button>
              </div>

              {editorMode[type] === "visual" ? (
                <div className="space-y-2">
                  <Label>Email Content (Drag blocks to reorder)</Label>
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <EmailBlockEditor
                      blocks={blocks[type] || []}
                      onChange={(newBlocks) => handleBlocksChange(type, newBlocks)}
                      variables={info.variables}
                    />
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={`${type}-body`}>Email Body (HTML)</Label>
                  <Textarea
                    id={`${type}-body`}
                    value={templates[type]?.html_body || ""}
                    onChange={(e) => handleTemplateChange(type, "html_body", e.target.value)}
                    placeholder="Enter HTML email body..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Available Variables</h4>
                <div className="flex flex-wrap gap-2">
                  {info.variables.map((variable) => (
                    <code
                      key={variable}
                      className="px-2 py-1 bg-background rounded text-xs cursor-pointer hover:bg-primary/10"
                      onClick={() => navigator.clipboard.writeText(variable)}
                      title="Click to copy"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end flex-wrap">
                <Button variant="outline" onClick={() => handleReset(type)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => generatePreview(type)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Email Preview</DialogTitle>
                    </DialogHeader>
                    {/* SECURITY: Use sandboxed iframe to prevent stored XSS from HTML templates */}
                    <iframe
                      className="border rounded-lg w-full min-h-[400px]"
                      sandbox="allow-same-origin"
                      srcDoc={previewHtml}
                      title="Email Preview"
                    />
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  onClick={() => handleSendTestEmail(type)}
                  disabled={sendingTest === type}
                >
                  {sendingTest === type ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sendingTest === type ? "Sending..." : "Send Test"}
                </Button>
                <Button onClick={() => handleSave(type)} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

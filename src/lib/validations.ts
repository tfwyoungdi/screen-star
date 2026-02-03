import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z
  .object({
    cinemaName: z
      .string()
      .trim()
      .min(1, 'Cinema name is required')
      .min(3, 'Cinema name must be at least 3 characters')
      .max(100, 'Cinema name must be less than 100 characters'),
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be less than 100 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .max(255, 'Email must be less than 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Box Office validation schemas
export const boxOfficeBookingSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .max(100, 'Name must be less than 100 characters')
    .default('Walk-in Customer'),
  customer_email: z
    .string()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .refine(
      (val) => !val || val === '' || z.string().email().safeParse(val).success,
      'Invalid email address'
    )
    .default(''),
  customer_phone: z
    .string()
    .trim()
    .max(20, 'Phone must be less than 20 characters')
    .refine(
      (val) => !val || val === '' || /^[\d\s\-+()]+$/.test(val),
      'Phone can only contain numbers, spaces, dashes, and parentheses'
    )
    .default(''),
});

export const boxOfficePhoneSearchSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 digits to search')
    .max(20, 'Phone number too long')
    .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format'),
});

export const boxOfficePromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Promo code is required')
    .max(50, 'Promo code is too long')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Promo code can only contain letters, numbers, dashes, and underscores'),
});

export const accessCodeSchema = z.object({
  accessCode: z
    .string()
    .length(6, 'Access code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Access code must contain only numbers'),
});

export type BoxOfficeBookingData = z.infer<typeof boxOfficeBookingSchema>;
export type BoxOfficePhoneSearch = z.infer<typeof boxOfficePhoneSearchSchema>;
export type BoxOfficePromoCode = z.infer<typeof boxOfficePromoCodeSchema>;
export type AccessCodeData = z.infer<typeof accessCodeSchema>;

// HTML sanitization helper for print content
export function sanitizeForPrint(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

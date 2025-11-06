import { z } from 'zod';

// Chat message validation
export const chatMessageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be less than 500 characters')
    .refine(
      (msg) => !/[<>]/.test(msg),
      'HTML tags are not allowed'
    )
});

// Profile validation
export const profileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  display_name: z.string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .optional(),
  bio: z.string()
    .trim()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  instagram_url: z.string()
    .trim()
    .url('Invalid URL format')
    .startsWith('https://instagram.com/', 'Must be an Instagram URL')
    .or(z.literal(''))
    .optional(),
  youtube_url: z.string()
    .trim()
    .url('Invalid URL format')
    .startsWith('https://youtube.com/', 'Must be a YouTube URL')
    .or(z.literal(''))
    .optional(),
  twitter_url: z.string()
    .trim()
    .url('Invalid URL format')
    .startsWith('https://twitter.com/', 'Must be a Twitter URL')
    .or(z.string().startsWith('https://x.com/', 'Must be a Twitter/X URL'))
    .or(z.literal(''))
    .optional(),
  website_url: z.string()
    .trim()
    .url('Invalid URL format')
    .or(z.literal(''))
    .optional()
});

// Live stream validation
export const liveStreamSchema = z.object({
  title: z.string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
});

// Auth validation
export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  display_name: z.string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address'),
  password: z.string()
    .min(1, 'Password is required')
});

// Report validation
export const reportSchema = z.object({
  reported_item_type: z.enum(['video', 'profile', 'comment', 'live_stream']),
  reported_item_id: z.string()
    .uuid('Invalid item ID'),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'nudity',
    'misinformation',
    'copyright',
    'self_harm',
    'illegal_content',
    'other'
  ]),
  description: z.string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type LiveStreamData = z.infer<typeof liveStreamSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ReportData = z.infer<typeof reportSchema>;

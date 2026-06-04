import { z } from 'zod';

export const AlertFrequencySchema = z.enum(['immediate', 'hourly', 'daily']);
export type AlertFrequency = z.infer<typeof AlertFrequencySchema>;

export const NotificationSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  telegramUserId: z.string().min(1),
  minGainAlertUsdt: z.number().nonnegative(),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
  alertFrequency: AlertFrequencySchema,
  updatedAt: z.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationUpdateSchema = NotificationSchema.omit({
  walletAddress: true,
  updatedAt: true,
}).partial();
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;

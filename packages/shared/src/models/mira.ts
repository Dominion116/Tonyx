import { z } from 'zod';

export const MiraRecommendationSchema = z.object({
  proceed: z.boolean(),
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1),
  suggestedAction: z.string(),
  followUpQuestion: z.string().optional(),
});

export type MiraRecommendation = z.infer<typeof MiraRecommendationSchema>;

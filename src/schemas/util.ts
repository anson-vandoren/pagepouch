import { z } from 'zod';

export const OpMetaSchema = z.object({
  success: z.boolean(),
  reason: z.string().optional(),
});
export type OpMeta = z.infer<typeof OpMetaSchema>;

const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.any(),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

export interface Wrapper<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import { z } from "zod";

export const emptyIpcPayloadSchema = z.object({}).strict();

export type EmptyIpcPayload = z.infer<typeof emptyIpcPayloadSchema>;

export const windowIsMaximizedResultSchema = z.boolean();

export const ipcAckResultSchema = z.union([z.void(), z.undefined(), z.null()]);

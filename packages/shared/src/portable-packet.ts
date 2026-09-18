import { z } from "zod";
import { packetV0Schema, type ProviderAgnosticPacket } from "./gateway";

export const packetPrivacyModeSchema = z.enum(["standard", "strict"]);

export type PacketPrivacyMode = z.infer<typeof packetPrivacyModeSchema>;

export const packetSliceKindSchema = z.enum([
  "project-instructions",
  "extra-system",
  "inactive-branch",
  "message",
  "old-message",
  "privacy",
]);

export type PacketSliceKind = z.infer<typeof packetSliceKindSchema>;

export const packetSliceSchema = z
  .object({
    kind: packetSliceKindSchema,
    id: z.string().nullable(),
    label: z.string().max(200),
    tokens: z.number().int().nonnegative(),
  })
  .strict();

export type PacketSlice = z.infer<typeof packetSliceSchema>;

export const portablePacketOriginSchema = z
  .object({
    source: z.enum(["compile", "import"]),
    projectLabel: z.string().max(200),
    conversationLabel: z.string().max(200),
  })
  .strict();

export type PortablePacketOrigin = z.infer<typeof portablePacketOriginSchema>;

export const portablePacketV1Schema = z
  .object({
    kind: z.literal("aihub.packet"),
    version: z.literal(1),
    privacyMode: packetPrivacyModeSchema,
    origin: portablePacketOriginSchema,
    included: z.array(packetSliceSchema).max(200),
    omitted: z.array(packetSliceSchema).max(200),
    payload: packetV0Schema,
  })
  .strict();

export type PortablePacketV1 = z.infer<typeof portablePacketV1Schema>;

export function clipPacketLabel(text: string, max = 200): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

export function portablePacketFromCompile(input: {
  privacyMode: PacketPrivacyMode;
  origin: PortablePacketOrigin;
  included: PacketSlice[];
  omitted: PacketSlice[];
  payload: ProviderAgnosticPacket;
}): PortablePacketV1 {
  return portablePacketV1Schema.parse({
    kind: "aihub.packet",
    version: 1,
    privacyMode: input.privacyMode,
    origin: portablePacketOriginSchema.parse(input.origin),
    included: input.included.slice(0, 200),
    omitted: input.omitted.slice(0, 200),
    payload: input.payload,
  });
}

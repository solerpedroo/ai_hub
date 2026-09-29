import { z } from "zod";

export const enterpriseToolPolicySchema = z.object({
  allowReadTools: z.boolean(),
  allowWriteTools: z.boolean(),
  blockPii: z.boolean(),
}).strict();

export const enterprisePolicySchema = z.object({
  allowedModels: z.array(z.string().min(1).max(128)).max(128),
  toolPolicy: enterpriseToolPolicySchema,
  teamMonthlyLimitUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).nullable(),
  analyticsOptIn: z.boolean(),
}).strict();
export type EnterprisePolicy = z.infer<typeof enterprisePolicySchema>;

export const organizationDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  policy: enterprisePolicySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();
export type OrganizationDto = z.infer<typeof organizationDtoSchema>;

export const organizationCreateInputSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
export type OrganizationCreateInput = z.infer<typeof organizationCreateInputSchema>;

export const organizationPolicyUpdateInputSchema = z.object({
  organizationId: z.string().uuid(),
  policy: enterprisePolicySchema,
}).strict();
export type OrganizationPolicyUpdateInput = z.infer<typeof organizationPolicyUpdateInputSchema>;

export const auditLogDtoSchema = z.object({ id: z.string().uuid(), organizationId: z.string().uuid(), action: z.string().min(1).max(120), detail: z.string().max(2_000), createdAt: z.string().datetime() }).strict();
export type AuditLogDto = z.infer<typeof auditLogDtoSchema>;
export const enterpriseAnalyticsDtoSchema = z.object({
  organizationId: z.string().uuid(),
  metrics: z.array(z.object({ metric: z.string().min(1).max(80), value: z.number().int().nonnegative() }).strict()).max(100),
}).strict();
export type EnterpriseAnalyticsDto = z.infer<typeof enterpriseAnalyticsDtoSchema>;
export const organizationIdInputSchema = z.object({ organizationId: z.string().uuid() }).strict();
export type OrganizationIdInput = z.infer<typeof organizationIdInputSchema>;

export const projectOrganizationInputSchema = z.object({ projectId: z.string().uuid(), organizationId: z.string().uuid() }).strict();
export type ProjectOrganizationInput = z.infer<typeof projectOrganizationInputSchema>;

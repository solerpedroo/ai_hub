export type SendAttachmentMode = "preview" | "send";

export function assertFileAttachmentAccess(input: {
  exists: boolean;
  rowProjectId: string | null;
  conversationProjectId: string | null;
  kind: string;
  vision: boolean;
  mode: SendAttachmentMode;
}): void {
  if (!input.exists) {
    throw new Error("files:unsupported");
  }
  if (input.rowProjectId !== input.conversationProjectId) {
    throw new Error("files:project_mismatch");
  }
  if (input.kind === "image" && !input.vision && input.mode === "send") {
    throw new Error("files:vision_required");
  }
}

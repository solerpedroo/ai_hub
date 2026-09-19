export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_INFLATE_BYTES = 4 * 1024 * 1024;
export const MAX_EXTRACT_CHARS = 80_000;
export const MAX_FILES_PER_SEND = 8;
export const MAX_FOLDER_FILES = 40;
export const MAX_FOLDER_DEPTH = 4;

export const FILE_KINDS = [
  "pdf",
  "docx",
  "text",
  "code",
  "csv",
  "image",
  "folder-summary",
] as const;

export type FileKind = (typeof FILE_KINDS)[number];

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export type ImageMime = (typeof IMAGE_MIMES)[number];

export interface ExtractResult {
  kind: FileKind;
  text: string;
  truncated: boolean;
  mime: string;
  image:
    | {
        mime: ImageMime;
        data: string;
      }
    | null;
}

export interface FolderFileInput {
  relativePath: string;
  content?: string;
}

export interface FolderSummary {
  text: string;
  stack: string;
}

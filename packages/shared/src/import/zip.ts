import { inflateRawSync } from "node:zlib";

const MAX_ZIP_ENTRIES = 256;
const MAX_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;

function readU16(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

function readU32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

export function isZipBuffer(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function unzipUtf8Files(bytes: Uint8Array): Array<{ name: string; text: string }> {
  const buffer = Buffer.from(bytes);
  const files: Array<{ name: string; text: string }> = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const signature = readU32(buffer, offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    }
    if (signature !== 0x04034b50) {
      break;
    }
    const flags = readU16(buffer, offset + 6);
    const method = readU16(buffer, offset + 8);
    const compressedSize = readU32(buffer, offset + 18);
    const nameLength = readU16(buffer, offset + 26);
    const extraLength = readU16(buffer, offset + 28);
    if (flags & 0x8) {
      throw new Error("Unsupported ZIP (streaming data descriptor)");
    }
    if (files.length >= MAX_ZIP_ENTRIES) {
      throw new Error("ZIP has too many entries");
    }
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8").replaceAll("\\", "/");
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    offset = dataStart + compressedSize;
    if (name.endsWith("/")) {
      continue;
    }
    let raw: Buffer;
    if (method === 0) {
      if (compressed.length > MAX_UNCOMPRESSED_BYTES) {
        throw new Error("ZIP entry is too large");
      }
      raw = Buffer.from(compressed);
    } else if (method === 8) {
      raw = inflateRawSync(compressed, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
    } else {
      continue;
    }
    files.push({ name, text: raw.toString("utf8") });
  }
  return files;
}

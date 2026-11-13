import path from "node:path";
import { access } from "node:fs/promises";

export const imageTypes = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export const audioTypes = { "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/aac": "aac" } as const;
export const mediaTypes = { image: imageTypes, audio: audioTypes };
export type MediaKind = keyof typeof mediaTypes;

export function mediaFile(kind: MediaKind, name: string) {
  return path.join(process.cwd(), "public", "uploads", kind, name);
}

export function matchesMedia(bytes: Buffer, extension: string) {
  const at = (offset: number, value: string) => bytes.subarray(offset, offset + value.length).toString("ascii") === value;
  switch (extension) {
    case "png": return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "jpg": return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case "webp": return at(0, "RIFF") && at(8, "WEBP");
    case "mp3": return at(0, "ID3") || (bytes[0] === 255 && bytes[1] >= 224);
    case "wav": return at(0, "RIFF") && at(8, "WAVE");
    case "ogg": return at(0, "OggS");
    case "m4a": return at(4, "ftyp");
    case "aac": return bytes[0] === 255 && (bytes[1] & 246) === 240;
    default: return false;
  }
}

export async function mediaExists({ coverUrl, audioUrl }: { coverUrl: string; audioUrl: string }) {
  const urls = [coverUrl, audioUrl].filter(Boolean);
  try {
    await Promise.all(urls.map((url) => {
      if (!url.startsWith("/api/exercise-media/")) return access(path.join(process.cwd(), "public", url.slice(1)));
      const [, , , kind, name] = url.split("/");
      return access(mediaFile(kind as MediaKind, name));
    }));
    return true;
  } catch { return false; }
}

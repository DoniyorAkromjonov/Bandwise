import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin, denied } from "@/lib/admin";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return Response.json({ error: "Audio uploads must not exceed 25 MB." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Audio file is required." }, { status: 400 });
  if (file.size < 1 || file.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Audio must be between 1 byte and 25 MB." }, { status: 413 });
  }

  const extension = ({
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
  } as Record<string, string>)[file.type];
  if (!extension) {
    return Response.json({ error: "Only MP3, WAV, OGG, M4A and AAC audio files are accepted." }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const signature = extension === "mp3"
    ? bytes.subarray(0, 3).toString() === "ID3" || (bytes[0] === 0xff && bytes[1] >= 0xe0)
    : extension === "wav"
      ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WAVE"
      : extension === "ogg"
        ? bytes.subarray(0, 4).toString() === "OggS"
        : extension === "m4a"
          ? bytes.subarray(4, 8).toString() === "ftyp"
          : bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
  if (!signature) return Response.json({ error: "File content does not match its audio type." }, { status: 415 });

  const name = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "audio");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), bytes, { flag: "wx" });
    return Response.json({ url: `/uploads/audio/${name}` }, { status: 201 });
  } catch (error) {
    console.error("Admin audio upload failed", error);
    return Response.json({ error: "Audio could not be stored. Please try again." }, { status: 500 });
  }
}

import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { denied, requireAdmin } from "@/lib/admin";
import { matchesMedia, mediaFile, mediaTypes } from "@/lib/exercises/media";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  if (Number(request.headers.get("content-length")) > 26 * 1024 * 1024) return Response.json({ error: "File exceeds 25 MB." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if ((kind !== "audio" && kind !== "image") || !(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 });

  const limit = kind === "audio" ? 25 : 5;
  if (!file.size || file.size > limit * 1024 * 1024) return Response.json({ error: `File must be between 1 byte and ${limit} MB.` }, { status: 413 });
  const extension = (mediaTypes[kind] as Record<string, string>)[file.type];
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!extension || !matchesMedia(bytes, extension)) return Response.json({ error: "Unsupported file format or invalid file content." }, { status: 415 });

  const name = `${randomUUID()}.${extension}`;
  const destination = mediaFile(kind, name);
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    return Response.json({ url: `/api/exercise-media/${kind}/${name}` }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save the file." }, { status: 500 });
  }
}

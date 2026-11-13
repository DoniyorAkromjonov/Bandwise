import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { mediaFile, mediaTypes } from "@/lib/exercises/media";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name } = await params;
  if ((kind !== "audio" && kind !== "image") || !/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(name)) return new Response(null, { status: 404 });
  const extension = name.split(".")[1];
  const type = Object.entries(mediaTypes[kind]).find(([, value]) => value === extension)?.[0];
  if (!type) return new Response(null, { status: 404 });

  const file = mediaFile(kind, name);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new Response(null, { status: 404 });

  const headers = new Headers({ "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" });
  const requestedRange = request.headers.get("range");
  let start = 0;
  let end = info.size - 1;
  if (requestedRange) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(end, Number(match[2])) : end;
    }
    if (!match || (!match[1] && !match[2]) || start > end || !Number.isSafeInteger(start)) {
      headers.set("Content-Range", `bytes */${info.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
  }
  headers.set("Content-Length", String(end - start + 1));
  return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: requestedRange ? 206 : 200, headers });
}

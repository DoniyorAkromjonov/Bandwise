import { prisma } from "@/lib/prisma";
import { jsonError, readingUserId } from "@/lib/reading/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await readingUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const { id } = await params;
  try {
    const result = await prisma.highlight.deleteMany({ where: { id, userId } });
    if (!result.count) return jsonError("Highlight not found", 404);
    return Response.json({ ok: true });
  } catch {
    return jsonError("Could not delete highlight", 500);
  }
}

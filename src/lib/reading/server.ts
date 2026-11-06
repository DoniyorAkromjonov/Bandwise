import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";

export async function readingUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

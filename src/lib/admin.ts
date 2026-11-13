import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";

export async function currentUserId() { const s = await getServerSession(authOptions); return s?.user?.id ?? null; }
export async function requireAdmin() { const id = await currentUserId(); if (!id) return { id: null, status: 401 as const }; const user = await prisma.user.findUnique({ where: { id }, select: { role: true } }); return user?.role === "ADMIN" ? { id, status: 200 as const } : { id: null, status: 403 as const }; }
export function denied(status: number) { return Response.json({ error: status === 401 ? "Authentication required" : "Administrator access required" }, { status }); }

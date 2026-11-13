import { denied, requireAdmin } from "@/lib/admin";
import { adminUserSelect } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 254);
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, 100000)) : 1;
  const pageSize = 25;
  const users = await prisma.user.findMany({
    where: query ? {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    } : undefined,
    select: adminUserSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  return Response.json({ users: users.slice(0, pageSize), hasMore: users.length > pageSize, adminId: admin.id });
}

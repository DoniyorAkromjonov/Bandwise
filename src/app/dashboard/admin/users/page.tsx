import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/lib/admin";

export const instant = false;

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin.id) redirect(admin.status === 401 ? "/login" : "/dashboard");

  return (
    <main className="page-shell py-10">
      <Link href="/dashboard/admin" className="text-sm text-primary">← Admin panel</Link>
      <h1 className="display-font mt-5 text-4xl">Users</h1>
      <UsersManager />
    </main>
  );
}

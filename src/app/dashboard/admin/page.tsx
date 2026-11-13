import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import { requireAdmin } from "@/lib/admin";

export const instant = false;

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin.id) redirect(admin.status === 401 ? "/login" : "/dashboard");

  return (
    <main className="page-shell py-10">
      <Link href="/dashboard" className="text-sm text-primary">← Dashboard</Link>
      <h1 className="display-font mb-6 mt-5 text-4xl">Admin panel</h1>
      <AdminConsole />
    </main>
  );
}

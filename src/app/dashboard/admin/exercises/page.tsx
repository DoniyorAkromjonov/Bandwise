import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ExerciseManager } from "@/components/admin/exercise-manager";
import { exerciseLabels, type Kind } from "@/lib/exercises/shared";

export default async function AdminExercisesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await connection();
  const admin = await requireAdmin();
  if (!admin.id) redirect(admin.status === 401 ? "/login" : "/dashboard");
  const { kind } = await searchParams;
  const initialKind = Object.keys(exerciseLabels).find((item) => item === kind) as Kind | undefined;
  return <main className="page-shell space-y-5 py-10">
    <Link href="/dashboard/admin" className="text-sm text-primary">← Admin panel</Link>
    <h1 className="display-font text-4xl">Exercise management</h1>
    <ExerciseManager key={initialKind} initialKind={initialKind ?? "DAILY_ARTICLE"} />
  </main>;
}

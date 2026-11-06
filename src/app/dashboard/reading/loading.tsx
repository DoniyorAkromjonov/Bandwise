export default function Loading() {
  return <main className="page-shell min-h-screen animate-pulse py-14"><div className="h-4 w-28 rounded bg-[#EEEAF8]" /><div className="mt-5 h-10 w-72 rounded bg-[#EEEAF8]" /><div className="mt-4 h-6 w-full max-w-xl rounded bg-[#F0EFF4]" /><div className="mt-9 h-14 rounded-2xl bg-white" /><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-60 rounded-2xl border border-[#E8E8F0] bg-white" />)}</div></main>;
}

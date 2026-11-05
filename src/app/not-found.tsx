import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFC] px-6 py-16">
      <section className="max-w-md text-center">
        <p className="eyebrow">404 · Page not found</p>
        <h1 className="display-font mt-4 text-4xl tracking-[-.035em]">Let’s find your way back.</h1>
        <p className="mt-3 leading-7 text-[#666580]">This page may have moved, or the address may be incorrect.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#7047FF] px-5 text-sm font-semibold text-white hover:bg-[#5D35EB]">Return to Bandwise</Link>
      </section>
    </main>
  );
}

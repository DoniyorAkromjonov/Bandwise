import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="Bandwise home"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src="/bandwise-logo.png"
        alt=""
        width={2172}
        height={724}
        sizes="(max-width: 640px) 132px, 168px"
        className="h-auto w-[132px] sm:w-[168px] dark:brightness-0 dark:invert"
      />
    </Link>
  );
}

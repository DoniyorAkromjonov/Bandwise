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
        sizes="(max-width: 640px) 152px, 168px"
        className="h-auto w-[152px] sm:w-[168px]"
      />
    </Link>
  );
}

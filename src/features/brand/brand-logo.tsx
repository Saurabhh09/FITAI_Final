import Link from "next/link";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="FITAI home">
      <span className="brand-mark" aria-hidden="true">
        <svg className="icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 15.5c5.7 0 9.7-3.2 13.5-10C19.8 14.7 15.3 20 8.5 20 6.6 20 5 18.4 5 16.5v-1Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 20c2.6-4 5.5-6.6 9.5-8.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>FITAI</span>
    </Link>
  );
}

import Image from "next/image";

export function ProductImage({
  imageUrl,
  alt,
  sizes,
  className = "",
}: {
  imageUrl: string | null;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-10 w-10"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3l18 18M3.75 3h16.5A1.5 1.5 0 0121.75 4.5v15a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-15A1.5 1.5 0 013.75 3z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${className}`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes ?? "200px"}
        className="object-contain"
      />
    </div>
  );
}

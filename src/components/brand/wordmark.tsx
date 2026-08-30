import { BRAND } from "@/lib/brand";

const markSize = {
  sm: "size-7 text-[13px]",
  md: "size-9 text-[15px]",
  lg: "size-11 text-[18px]",
} as const;

const labelSize = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
} as const;

/** The 8x mark: a rounded badge carrying the wordmark. */
export function BrandMark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof markSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`font-display grid shrink-0 place-items-center rounded-[10px] bg-white font-semibold leading-none tracking-[-0.06em] text-black ${markSize[size]} ${className}`}
    >
      {BRAND.name}
    </span>
  );
}

/**
 * The 8x lockup: mark plus wordmark, with an optional surface label
 * ("Admin", "Judges") for interface-specific context.
 */
export function Wordmark({
  size = "md",
  label,
  className = "",
}: {
  size?: keyof typeof markSize;
  label?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span
        className={`font-display font-semibold leading-none tracking-[-0.04em] text-white ${labelSize[size]}`}
      >
        {BRAND.name}
        {label ? (
          <span className="ml-1.5 font-medium text-[#9b9b9b]">{label}</span>
        ) : null}
      </span>
    </span>
  );
}

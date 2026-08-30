import { EightXLogo } from "@/components/brand/eight-x-logo";

type LockupProps = {
  /** Text shown after the 8x mark. Defaults to the product name. */
  label?: string;
  /** `lg` for hero/login surfaces, `sm` for dense chrome like the sidebar. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * The 8x mark paired with the product wordmark. Used anywhere the app
 * introduces itself: sidebar, login, judge portal, public apply page.
 */
export function BrandLockup({
  label = "Draki",
  size = "sm",
  className = "",
}: LockupProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      {label ? (
        <span
          className={`font-display tracking-[-0.03em] text-ink ${
            size === "lg" ? "text-2xl" : "text-lg"
          }`}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** The mark on its own, for collapsed chrome. */
export function BrandMark({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className="grid place-items-center rounded-xl bg-btn p-[7px]">
      <EightXLogo
        className={`${size === "lg" ? "h-6" : "h-[18px]"} w-auto text-btn-fg`}
      />
    </span>
  );
}

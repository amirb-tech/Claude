import { MARK_PATHS } from "../brand";

export function Mark({ className = "brand__mark" }: { className?: string }) {
  const l = MARK_PATHS.line;
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d={MARK_PATHS.triangle} fill="currentColor" />
      <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} fill="currentColor" />
    </svg>
  );
}

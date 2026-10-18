/**
 * Lets its children run wider than the reading column on large screens (up to
 * 960px, and clear of the left rail), centered on the column. On small screens
 * it is the column width.
 *
 *   <Wide><TandemBoardDemo /></Wide>
 */
export default function Wide({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 w-[min(960px,calc(100vw-3rem))] max-w-none -translate-x-1/2 min-[1200px]:w-[max(100%,min(960px,calc(100vw-528px)))]">
      {children}
    </div>
  );
}

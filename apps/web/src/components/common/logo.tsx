import Image from "next/image";
import Link from "next/link";

// Tango logo artwork, cropped from design/brand/. The dark-text version
// shows in light mode and the white-text version in dark mode. The hidden one
// stays lazy, so the browser only downloads the variant it shows. `onDark`
// always shows the white-text version, for surfaces that are dark in both
// themes. The brand name is never translated, so the alt text is written here.
// The logo links home: `/` sends signed-out visitors to the landing page and
// the proxy sends signed-in parents on to /dashboard. Signed-in-only pages pass
// `/dashboard` to skip that redirect. `mark` shows only the square icon art,
// for the narrow dashboard rail. `small` is the dashboard sidebar's size, sized
// to sit beside the rail's mark when the sidebar collapses.

// Display sizes (h-9 = 36px, h-7 = 28px tall) at the artwork's 1497x493 ratio,
// so next/image serves 1x/2x versions of this size rather than the full-size
// artwork.
const SIZES = {
  regular: { width: 109, height: 36, className: "h-9 w-auto" },
  small: { width: 85, height: 28, className: "h-7 w-auto" },
};
const MARK_SIZE = 32;

export function Logo({
  className = "",
  onDark = false,
  mark = false,
  small = false,
  href = "/",
}: {
  className?: string;
  onDark?: boolean;
  mark?: boolean;
  small?: boolean;
  href?: "/" | "/dashboard";
}) {
  const linkClass = `flex w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 ${className}`;
  if (mark) {
    return (
      <Link href={href} className={linkClass}>
        <Image src="/brand/mark.png" alt="Tango" width={MARK_SIZE} height={MARK_SIZE} className="size-8" />
      </Link>
    );
  }
  const size = small ? SIZES.small : SIZES.regular;
  return (
    <Link href={href} className={linkClass}>
      {onDark ? null : (
        <Image
          src="/brand/logo-light.png"
          alt="Tango"
          width={size.width}
          height={size.height}
          className={`${size.className} dark:hidden`}
        />
      )}
      <Image
        src="/brand/logo-dark.png"
        alt="Tango"
        width={size.width}
        height={size.height}
        className={onDark ? size.className : `hidden ${size.className} dark:block`}
      />
    </Link>
  );
}

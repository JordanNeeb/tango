// Profiles have no photos, so people are shown by their initials. Decorative:
// the name is always given as text nearby.
function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

export function InitialsAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-12 flex-none items-center justify-center rounded-full bg-gray-50 text-sm font-medium text-gray-600 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:text-gray-300 dark:outline-white/10"
    >
      {initials(name)}
    </span>
  );
}

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

export function InitialsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-gray-800 font-medium text-gray-300 outline -outline-offset-1 outline-white/10 ${
        size === "sm" ? "size-8 text-xs" : "size-12 text-sm"
      }`}
    >
      {initials(name)}
    </span>
  );
}

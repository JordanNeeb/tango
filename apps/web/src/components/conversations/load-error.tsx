export function LoadError({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
      {message}
    </p>
  );
}

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <ChatBubbleLeftRightIcon aria-hidden="true" className="size-12 text-gray-500" />
      <h2 className="mt-2 text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-gray-400">{description}</p>
    </div>
  );
}

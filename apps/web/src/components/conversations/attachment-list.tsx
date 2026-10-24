"use client";

import {
  ArrowDownTrayIcon,
  DocumentIcon,
  DocumentTextIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import { formatBytes } from "@/lib/attachments";
import { useLanguage, useMessages } from "@/lib/i18n/language-provider";

import { AttachmentViewer } from "./attachment-viewer";
import { type ConversationAttachment } from "./types";

const tileFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500";

// A file's icon, name, and size. Linked when it can be opened or downloaded;
// plain while it's still sending or its link couldn't be signed.
function FileTile({
  attachment,
  href,
  newTab,
  label,
}: {
  attachment: ConversationAttachment;
  href: string | null;
  newTab?: boolean;
  label: string;
}) {
  const language = useLanguage();
  const Icon = attachment.kind === "pdf" ? DocumentTextIcon : DocumentIcon;
  const content = (
    <>
      <Icon aria-hidden="true" className="size-8 shrink-0 text-gray-400 dark:text-gray-500" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
          {attachment.name}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {formatBytes(attachment.sizeBytes, language)}
        </span>
      </span>
      {href && attachment.kind === "download" ? (
        <ArrowDownTrayIcon aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
      ) : null}
    </>
  );
  const className =
    "flex w-64 max-w-full items-center gap-x-3 rounded-xl bg-white p-3 text-left ring-1 ring-gray-200 ring-inset dark:bg-white/5 dark:ring-white/10";
  if (!href) return <div className={className}>{content}</div>;
  return (
    <a
      href={href}
      aria-label={label}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${className} hover:bg-gray-50 dark:hover:bg-white/10 ${tileFocus}`}
    >
      {content}
    </a>
  );
}

// A photo thumbnail or video tile that opens the viewer. Falls back to the
// file tile if the thumbnail can't load.
function MediaTile({
  attachment,
  onOpen,
}: {
  attachment: ConversationAttachment;
  onOpen: () => void;
}) {
  const messages = useMessages().conversations.attachments;
  const [failed, setFailed] = useState(false);
  const label = (attachment.kind === "video" ? messages.play : messages.open).replace(
    "{name}",
    () => attachment.name,
  );
  if (failed || !attachment.url) {
    return (
      <FileTile
        attachment={attachment}
        href={attachment.downloadUrl}
        label={messages.downloadName.replace("{name}", () => attachment.name)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={`relative block size-40 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 ring-inset dark:bg-white/5 dark:ring-white/10 ${tileFocus}`}
    >
      {attachment.kind === "video" ? (
        <>
          <video
            src={attachment.url}
            preload="metadata"
            muted
            playsInline
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircleIcon aria-hidden="true" className="size-12 text-white" />
          </span>
        </>
      ) : (
        // Signed storage links can't go through next/image's optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </button>
  );
}

// A message's attachments in upload order. Photos and videos open in the
// viewer, PDFs in a new tab with the browser's viewer, and files browsers
// can't show download under their original names.
export function AttachmentList({
  attachments,
  mine,
}: {
  attachments: ConversationAttachment[];
  mine: boolean;
}) {
  const messages = useMessages().conversations.attachments;
  const [open, setOpen] = useState<ConversationAttachment | null>(null);
  return (
    <>
      <ul
        role="list"
        aria-label={messages.label}
        className={`flex flex-wrap gap-2 ${mine ? "justify-end" : ""}`}
      >
        {attachments.map((attachment) => (
          <li key={attachment.id} className="max-w-full">
            {attachment.kind === "image" || attachment.kind === "video" ? (
              <MediaTile attachment={attachment} onOpen={() => setOpen(attachment)} />
            ) : attachment.kind === "pdf" ? (
              <FileTile
                attachment={attachment}
                href={attachment.url}
                newTab
                label={messages.open.replace("{name}", () => attachment.name)}
              />
            ) : (
              <FileTile
                attachment={attachment}
                href={attachment.downloadUrl}
                label={messages.downloadName.replace("{name}", () => attachment.name)}
              />
            )}
          </li>
        ))}
      </ul>
      <AttachmentViewer attachment={open} onClose={() => setOpen(null)} />
    </>
  );
}

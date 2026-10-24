"use client";

import { Button } from "@/components/catalyst/button";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/catalyst/dialog";
import { useMessages } from "@/lib/i18n/language-provider";

import { type ConversationAttachment } from "./types";

// A photo or video, full size, over the conversation. Escape, the backdrop,
// and Close all close it, and Headless UI returns focus to the tile that
// opened it.
export function AttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: ConversationAttachment | null;
  onClose: () => void;
}) {
  const messages = useMessages().conversations.attachments;
  return (
    <Dialog open={attachment !== null} onClose={onClose} size="5xl">
      {attachment ? (
        <>
          <DialogTitle className="truncate">{attachment.name}</DialogTitle>
          <DialogBody className="flex justify-center">
            {attachment.kind === "video" && attachment.url ? (
              <video
                src={attachment.url}
                controls
                autoPlay
                playsInline
                className="max-h-[70vh] w-full rounded-lg bg-black"
              />
            ) : attachment.url ? (
              // Signed storage links can't go through next/image's optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-[70vh] w-auto rounded-lg object-contain"
              />
            ) : null}
          </DialogBody>
          <DialogActions>
            {attachment.downloadUrl ? (
              <Button outline href={attachment.downloadUrl}>
                {messages.download}
              </Button>
            ) : null}
            <Button onClick={onClose}>{messages.close}</Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}

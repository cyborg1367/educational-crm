"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api/config";
import { toApiError } from "@/lib/api/errors";
import type { UserRead } from "@/lib/api/types";
import { deleteUserSignature, uploadUserSignature } from "@/lib/api/users";

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

export type UserSignatureCellProps = {
  user: UserRead;
  onChanged: (user: UserRead) => void;
  onError: (message: string) => void;
};

export function UserSignatureCell({
  user,
  onChanged,
  onError,
}: UserSignatureCellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const updated = await uploadUserSignature(user.id, file);
      onChanged(updated);
    } catch (err) {
      onError(toApiError(err, "خطا در آپلود امضا").detail);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const updated = await deleteUserSignature(user.id);
      onChanged(updated);
    } catch (err) {
      onError(toApiError(err, "خطا در حذف امضا").detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-[var(--primitive-space-2)]">
      {user.signature_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_BASE_URL}${user.signature_url}`}
          alt={`امضای ${user.name}`}
          className="h-[32px] w-[64px] rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)] object-contain bg-[var(--semantic-color-surface-subtle)]"
        />
      ) : (
        <span className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          —
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => void handleFileSelected(event)}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {user.signature_url ? "تغییر" : "آپلود"}
      </Button>

      {user.signature_url ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void handleDelete()}
        >
          حذف
        </Button>
      ) : null}
    </div>
  );
}

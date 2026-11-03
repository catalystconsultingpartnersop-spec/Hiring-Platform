"use client";

import { useEffect, useRef } from "react";

// Put inside any form with a file upload. Before it's sent, phone photos are
// shrunk (a photo of a resume or assessment can be 5 to 10 MB, more than the
// site accepts), and files that are still too big get a clear message.
const LIMIT = 4 * 1024 * 1024;

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function UploadHelper() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let ready = false;
    const onSubmit = async (e: SubmitEvent) => {
      if (ready) {
        ready = false;
        return;
      }
      const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type="file"]')].filter((i) => i.files?.length);
      if (!inputs.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      for (const input of inputs) {
        const file = await shrink(input.files![0]);
        if (file !== input.files![0]) {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
        }
        if (file.size > LIMIT) {
          input.setCustomValidity("That file is over 4 MB. Please use a smaller PDF, or take a photo of it instead.");
          input.reportValidity();
          input.addEventListener("change", () => input.setCustomValidity(""), { once: true });
          return;
        }
      }
      ready = true;
      form.requestSubmit((e.submitter as HTMLElement | null) ?? undefined);
    };
    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, []);
  return <span ref={ref} hidden />;
}

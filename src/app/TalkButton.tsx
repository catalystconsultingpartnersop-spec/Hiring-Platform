"use client";

// "Talk to our team": brings the call-back form into view and puts the cursor
// in its first box, so on a computer (where the form is already on screen) the
// button visibly does something.
export function TalkButton({ className }: { className: string }) {
  return (
    <a
      href="#callback"
      className={className}
      onClick={() => {
        setTimeout(() => (document.querySelector("#callback input[name=role]") as HTMLInputElement | null)?.focus({ preventScroll: true }), 350);
      }}
    >
      Talk to our team
    </a>
  );
}

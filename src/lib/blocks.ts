// How a block of free time turns into bookable calls. Shared by the booking
// page and the My hours form, so the count a rep sees is what candidates get.
//
// A block with room for just one call becomes a single call that fills it
// (30 to 45 minutes). Longer blocks hold several calls of the rep's usual length.
export function callsInBlock(start: number, end: number, len: number): { at: number; minutes: number }[] {
  const span = end - start;
  if (span < 30) return [];
  if (span < len * 2) return [{ at: start, minutes: Math.min(Math.max(span, 30), 45) }];
  const step = len === 30 ? 30 : 60; // 45-minute calls start on the hour, with a breather
  const out: { at: number; minutes: number }[] = [];
  for (let m = start; m + len <= end; m += step) out.push({ at: m, minutes: len });
  return out;
}

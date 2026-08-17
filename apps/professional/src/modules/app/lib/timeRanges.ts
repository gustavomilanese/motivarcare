/** True if [startA, endA) overlaps [startB, endB). Equal endpoints do not overlap. */
export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

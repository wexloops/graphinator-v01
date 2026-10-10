/** House spectrum. Groups take hues in order, so the same graph always colors the same way. */
export const SPECTRUM = ['#7DF9FF', '#FF2BD6', '#D4FF3A', '#8B5CFF', '#FF7A1A', '#3DFFB0', '#FFD23A', '#FF5C7A'];

export function groupHues(groups: { name: string }[]): Map<string, string> {
  return new Map(groups.map((g, i) => [g.name, SPECTRUM[i % SPECTRUM.length]]));
}

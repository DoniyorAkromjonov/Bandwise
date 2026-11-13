export function words(text: string): string[] {
  return text.normalize("NFKC").toLowerCase().replaceAll("’", "'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
}

type Correction = { kind: "match" | "incorrect" | "missing" | "extra"; expected?: string; actual?: string };

export function gradeTranscription(reference: string, submission: string) {
  const expected = words(reference);
  const actual = words(submission);
  const width = actual.length + 1;
  const cost = new Uint16Array((expected.length + 1) * width);
  for (let i = 0; i <= expected.length; i++) cost[i * width] = i;
  for (let j = 0; j <= actual.length; j++) cost[j] = j;
  for (let i = 1; i <= expected.length; i++) {
    for (let j = 1; j <= actual.length; j++) {
      const offset = i * width + j;
      cost[offset] = Math.min(
        cost[offset - width - 1] + Number(expected[i - 1] !== actual[j - 1]),
        cost[offset - width] + 1,
        cost[offset - 1] + 1,
      );
    }
  }

  const corrections: Correction[] = [];
  let i = expected.length;
  let j = actual.length;
  while (i || j) {
    const offset = i * width + j;
    const same = expected[i - 1] === actual[j - 1];
    if (i && j && cost[offset] === cost[offset - width - 1] + Number(!same)) {
      corrections.push({ kind: same ? "match" : "incorrect", expected: expected[--i], actual: actual[--j] });
    } else if (i && cost[offset] === cost[offset - width] + 1) {
      corrections.push({ kind: "missing", expected: expected[--i] });
    } else {
      corrections.push({ kind: "extra", actual: actual[--j] });
    }
  }
  const total = expected.length;
  return { score: Math.max(0, total - cost[expected.length * width + actual.length]), total, corrections: corrections.reverse() };
}

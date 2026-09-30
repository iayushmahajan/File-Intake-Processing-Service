import Papa from "papaparse";
export function parseCsvPreview(text: string, limit = 25): string[][] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    preview: limit + 1,
  });
  if (result.errors.some((error) => error.code === "MissingQuotes")) {
    throw new Error(
      "This file has malformed CSV quoting. Download it to inspect the original.",
    );
  }
  return result.data;
}

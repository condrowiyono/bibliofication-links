/** ISBN helpers. ISBN is to books what the IMDb id is to films: one number per edition. */

/** Strips spaces, hyphens and a leading "ISBN" so "978-979-22-7728-9" becomes "9789792277289". */
export function cleanIsbn(input: string): string {
  return input
    .toUpperCase()
    .replace(/^\s*ISBN(-1[03])?:?\s*/, "")
    .replace(/[^0-9X]/g, "");
}

export function isValidIsbn13(s: string): boolean {
  if (!/^97[89]\d{10}$/.test(s)) return false;
  const sum = [...s].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

export function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  const sum = [...s].reduce((acc, d, i) => acc + (d === "X" ? 10 : Number(d)) * (10 - i), 0);
  return sum % 11 === 0;
}

/** The input as a valid ISBN-10 or ISBN-13, or null when it isn't one. */
export function parseIsbn(input: string): string | null {
  const s = cleanIsbn(input);
  return isValidIsbn13(s) || isValidIsbn10(s) ? s : null;
}

export function toIsbn13(isbn: string): string {
  if (isbn.length === 13) return isbn;
  const core = `978${isbn.slice(0, 9)}`;
  const sum = [...core].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}

/** Only 978-prefixed ISBN-13s have an ISBN-10 form; 979 ones return "". */
export function toIsbn10(isbn: string): string {
  if (isbn.length === 10) return isbn;
  if (!isbn.startsWith("978")) return "";
  const core = isbn.slice(3, 12);
  const sum = [...core].reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

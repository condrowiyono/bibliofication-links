/**
 * A flag for one edition of a book, to tell editions apart (the Indonesian translation vs the English
 * original). From the edition's language when a source gives one, otherwise from the ISBN: its first
 * digits after 978/979 are the registration group, i.e. the country or language area of the publisher.
 * Safe to use in the browser.
 */

const BY_LANGUAGE: Record<string, { flag: string; label: string }> = {
  indonesian: { flag: "🇮🇩", label: "Indonesian" },
  english: { flag: "🇬🇧", label: "English" },
  malay: { flag: "🇲🇾", label: "Malay" },
  japanese: { flag: "🇯🇵", label: "Japanese" },
  korean: { flag: "🇰🇷", label: "Korean" },
  chinese: { flag: "🇨🇳", label: "Chinese" },
  french: { flag: "🇫🇷", label: "French" },
  german: { flag: "🇩🇪", label: "German" },
  spanish: { flag: "🇪🇸", label: "Spanish" },
  italian: { flag: "🇮🇹", label: "Italian" },
  portuguese: { flag: "🇵🇹", label: "Portuguese" },
  dutch: { flag: "🇳🇱", label: "Dutch" },
  russian: { flag: "🇷🇺", label: "Russian" },
  arabic: { flag: "🇸🇦", label: "Arabic" },
  thai: { flag: "🇹🇭", label: "Thai" },
  vietnamese: { flag: "🇻🇳", label: "Vietnamese" },
  hindi: { flag: "🇮🇳", label: "Hindi" },
  tagalog: { flag: "🇵🇭", label: "Filipino" },
  filipino: { flag: "🇵🇭", label: "Filipino" },
  turkish: { flag: "🇹🇷", label: "Turkish" },
  persian: { flag: "🇮🇷", label: "Persian" },
  romanian: { flag: "🇷🇴", label: "Romanian" },
  ukrainian: { flag: "🇺🇦", label: "Ukrainian" },
  hebrew: { flag: "🇮🇱", label: "Hebrew" },
  greek: { flag: "🇬🇷", label: "Greek" },
  hungarian: { flag: "🇭🇺", label: "Hungarian" },
  lithuanian: { flag: "🇱🇹", label: "Lithuanian" },
  finnish: { flag: "🇫🇮", label: "Finnish" },
  norwegian: { flag: "🇳🇴", label: "Norwegian" },
  danish: { flag: "🇩🇰", label: "Danish" },
  swedish: { flag: "🇸🇪", label: "Swedish" },
  polish: { flag: "🇵🇱", label: "Polish" },
  slovak: { flag: "🇸🇰", label: "Slovak" },
  czech: { flag: "🇨🇿", label: "Czech" },
};

/** ISBN registration groups (after the 978/979 prefix), longest first so "602" wins over "6". */
const BY_GROUP: [prefix: string, flag: string, label: string][] = [
  ["978602", "🇮🇩", "Indonesian"],
  ["978623", "🇮🇩", "Indonesian"],
  ["978979", "🇮🇩", "Indonesian"],
  ["978983", "🇲🇾", "Malaysian"],
  ["978967", "🇲🇾", "Malaysian"],
  ["978981", "🇸🇬", "Singaporean"],
  ["978971", "🇵🇭", "Filipino"],
  ["978621", "🇵🇭", "Filipino"],
  ["978974", "🇹🇭", "Thai"],
  ["978616", "🇹🇭", "Thai"],
  ["978604", "🇻🇳", "Vietnamese"],
  ["978957", "🇹🇼", "Taiwanese"],
  ["978986", "🇹🇼", "Taiwanese"],
  ["978962", "🇭🇰", "Hong Kong"],
  ["978988", "🇭🇰", "Hong Kong"],
  ["978972", "🇵🇹", "Portuguese"],
  ["978989", "🇵🇹", "Portuguese"],
  ["978609", "🇱🇹", "Lithuanian"],
  ["978963", "🇭🇺", "Hungarian"],
  ["978960", "🇬🇷", "Greek"],
  ["978975", "🇹🇷", "Turkish"],
  ["978605", "🇹🇷", "Turkish"],
  ["978965", "🇮🇱", "Hebrew"],
  ["978951", "🇫🇮", "Finnish"],
  ["978952", "🇫🇮", "Finnish"],
  ["978950", "🇦🇷", "Argentine"],
  ["978987", "🇦🇷", "Argentine"],
  ["978968", "🇲🇽", "Mexican"],
  ["978970", "🇲🇽", "Mexican"],
  ["978607", "🇲🇽", "Mexican"],
  ["978956", "🇨🇱", "Chilean"],
  ["978958", "🇨🇴", "Colombian"],
  ["978973", "🇷🇴", "Romanian"],
  ["978606", "🇷🇴", "Romanian"],
  ["978954", "🇧🇬", "Bulgarian"],
  ["978966", "🇺🇦", "Ukrainian"],
  ["978617", "🇺🇦", "Ukrainian"],
  ["978600", "🇮🇷", "Persian"],
  ["978964", "🇮🇷", "Persian"],
  ["978969", "🇵🇰", "Pakistani"],
  ["978984", "🇧🇩", "Bengali"],
  ["978955", "🇱🇰", "Sri Lankan"],
  ["97880", "🇨🇿", "Czech/Slovak"],
  ["97882", "🇳🇴", "Norwegian"],
  ["97883", "🇵🇱", "Polish"],
  ["97887", "🇩🇰", "Danish"],
  ["97891", "🇸🇪", "Swedish"],
  ["97889", "🇰🇷", "Korean"],
  ["97911", "🇰🇷", "Korean"],
  ["97884", "🇪🇸", "Spanish"],
  ["97888", "🇮🇹", "Italian"],
  ["97912", "🇮🇹", "Italian"],
  ["97890", "🇳🇱", "Dutch"],
  ["97894", "🇳🇱", "Dutch"],
  ["97885", "🇧🇷", "Brazilian"],
  ["97881", "🇮🇳", "Indian"],
  ["97893", "🇮🇳", "Indian"],
  ["97910", "🇫🇷", "French"],
  ["9798", "🇺🇸", "American"],
  ["9780", "🇬🇧", "English"],
  ["9781", "🇬🇧", "English"],
  ["9782", "🇫🇷", "French"],
  ["9783", "🇩🇪", "German"],
  ["9784", "🇯🇵", "Japanese"],
  ["9785", "🇷🇺", "Russian"],
  ["9787", "🇨🇳", "Chinese"],
];

export type EditionFlag = { flag: string; label: string };

export function editionFlag(b: { language?: string; isbn13?: string }): EditionFlag | null {
  const lang = BY_LANGUAGE[(b.language ?? "").trim().toLowerCase()];
  if (lang) return lang;
  const isbn = (b.isbn13 ?? "").replace(/\D/g, "");
  if (isbn.length === 13) {
    const hit = BY_GROUP.find(([prefix]) => isbn.startsWith(prefix));
    if (hit) return { flag: hit[1], label: hit[2] };
  }
  return null;
}

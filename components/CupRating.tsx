/** Her rating as cups of matcha, out of five. Full cups hold tea; the rest are empty. */
export function CupRating({ value, size = 22 }: { value: number; size?: number }) {
  return (
    <span className="cups" role="img" aria-label={`Rated ${value} out of 5 cups`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 28 24" width={size} height={(size * 24) / 28} aria-hidden="true" className={n <= value ? "cup-full" : "cup-empty"}>
          <path className="mini-handle" d="M21 8.5c5 0 5 7-1 7.5" />
          <path className="mini-body" d="M3 7h19v3.5C22 17 18 21 12.5 21S3 17 3 10.5Z" />
          <ellipse className="mini-tea" cx="12.5" cy="7" rx="9.5" ry="2" />
        </svg>
      ))}
    </span>
  );
}

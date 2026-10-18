/** A cup of matcha resting beside the books: green surface, a little foam, steam. */
export function TeaCup({ label }: { label: string }) {
  return (
    <div className="cup">
      <svg viewBox="0 0 96 84" width="96" height="84" aria-hidden="true">
        <path className="cup-steam" d="M30 18c-5-5 5-9 0-15M44 20c-5-5 5-9 0-15M58 18c-5-5 5-9 0-15" />
        <ellipse className="cup-saucer" cx="44" cy="79" rx="40" ry="4.5" />
        <path className="cup-handle" d="M76 38c13 0 13 20-3 22" />
        <path className="cup-body" d="M10 30h68v12c0 19-14 33-34 33S10 61 10 42Z" />
        <ellipse className="cup-tea" cx="44" cy="30" rx="34" ry="6" />
        <path className="cup-foam" d="M36 30c3-3 13-3 16 0-3 2-13 2-16 0Z" />
      </svg>
      <span className="cup-label">{label}</span>
    </div>
  );
}

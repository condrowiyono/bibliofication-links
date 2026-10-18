import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ textAlign: "center", paddingTop: "18vh" }}>
      <h1 className="name">Obliviated.</h1>
      <p className="bio">This page doesn&apos;t exist, or someone wiped it from memory.</p>
      <p>
        <Link href="/">Back to the links</Link>
      </p>
    </main>
  );
}

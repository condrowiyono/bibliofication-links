import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BrandIcon, platformName } from "@/components/BrandIcon";
import { Avatar, ProductImage, ShareButton, ThemeToggle } from "@/components/PageControls";
import { TeaCup } from "@/components/TeaCup";
import { getEssays } from "@/lib/medium";
import { getSite, publicLinks, publicShopItems, STORE_NAMES, STORES, type LinkItem, type Site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { profile } = await getSite();
  return {
    title: `${profile.name} (${profile.handle})`,
    description: profile.bio,
    openGraph: { title: `${profile.name} (${profile.handle})`, description: profile.bio, images: profile.avatar ? [profile.avatar] : [] },
  };
}

export default async function Home() {
  await connection();
  const site = await getSite();
  const { profile } = site;
  const links = publicLinks(site);

  return (
    <div className="page">
      <nav className="topbar" aria-label="Page controls">
        <ShareButton title={`${profile.name} (${profile.handle})`} />
        <ThemeToggle />
      </nav>

      <header className="plate">
        <p className="ex-libris">Ex Libris</p>
        <Avatar src={profile.avatar} name={profile.name} />
        <h1 className="name">{profile.name}</h1>
        <p className="handle">{profile.handle}</p>
        <p className="bio">{profile.bio}</p>

        {site.socials.length > 0 && (
          <ul className="socials">
            {site.socials.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={platformName(s.platform)}>
                  <BrandIcon platform={s.platform} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>

      {profile.shelf.length > 0 && (
        <section className="shelf" aria-label="Things I love">
          {profile.shelf.map((word, i) =>
            isDrink(word) ? (
              <TeaCup key={word} label={word} />
            ) : (
              <span key={word} className={`spine spine-${i % 5}`}>
                {word}
              </span>
            ),
          )}
        </section>
      )}

      <main className="links">
        <ShopSection shop={site.shop} items={publicShopItems(site)} />

        {links.length === 0 ? (
          <p className="empty">Nothing on the shelf yet. Check back soon.</p>
        ) : (
          <LinkList links={links} />
        )}

        {site.medium.show && site.medium.username && (
          <section className="essays" aria-labelledby="essays-title">
            <h2 id="essays-title" className="chapter">
              Latest essays
            </h2>
            <Suspense fallback={<p className="essays-note">Fetching the latest pages from Medium…</p>}>
              <Essays username={site.medium.username} count={site.medium.count} />
            </Suspense>
          </section>
        )}
      </main>

      {site.footer && <footer className="footer">{site.footer}</footer>}
    </div>
  );
}

/** Drinks sit on the shelf as a cup instead of a book. */
const isDrink = (word: string) => /matcha|tea|teh|coffee|kopi|latte/i.test(word);

function ShopSection({ shop, items }: { shop: Site["shop"]; items: Site["shop"]["items"] }) {
  const storeLinks = STORES.filter((st) => shop.stores[st]);
  if (items.length === 0 && storeLinks.length === 0) return null;
  return (
    <section aria-labelledby="shop-title">
      <h2 id="shop-title" className="chapter">
        {shop.title}
      </h2>
      {items.length > 0 && (
        <ul className="shop-grid">
          {items.map((it) => (
            <li key={it.id}>
              <a href={it.url} target="_blank" rel="sponsored noopener noreferrer" className="product">
                <ProductImage src={it.image} fallback={<BrandIcon platform={it.store} size={32} />} />
                <span className="product-store">
                  <BrandIcon platform={it.store} size={13} />
                  {STORE_NAMES[it.store]}
                </span>
                <span className="product-title">{it.title}</span>
                {it.price && <span className="product-price">{it.price}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
      {storeLinks.map((st) => (
        <a key={st} href={shop.stores[st]} target="_blank" rel="sponsored noopener noreferrer" className="card card-featured">
          <span className="card-mark" aria-hidden="true">
            <BrandIcon platform={st} size={22} />
          </span>
          <span className="card-text">
            <span className="card-title">See everything on {STORE_NAMES[st]}</span>
            <span className="card-sub">All my {STORE_NAMES[st]} picks in one place</span>
          </span>
        </a>
      ))}
    </section>
  );
}

function LinkList({ links }: { links: LinkItem[] }) {
  let n = 0;
  return links.map((l) => {
    if (l.type === "header") {
      return (
        <h2 key={l.id} className="chapter">
          {l.title}
        </h2>
      );
    }
    n += 1;
    return (
      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={`card${l.featured ? " card-featured" : ""}`}>
        <span className="card-mark" aria-hidden="true">
          {l.icon ? <BrandIcon platform={l.icon} size={22} /> : <span className="card-letter">{l.title.charAt(0)}</span>}
        </span>
        <span className="card-text">
          <span className="card-title">{l.title}</span>
          {l.subtitle && <span className="card-sub">{l.subtitle}</span>}
        </span>
        <span className="card-no" aria-hidden="true">
          No. {String(n).padStart(2, "0")}
        </span>
      </a>
    );
  });
}

async function Essays({ username, count }: { username: string; count: number }) {
  const profileUrl = `https://medium.com/@${username}`;
  let essays;
  try {
    essays = (await getEssays(username)).slice(0, count);
  } catch {
    return (
      <p className="essays-note">
        Medium isn&apos;t answering right now. <a href={profileUrl}>Read the essays on Medium</a>.
      </p>
    );
  }
  if (essays.length === 0) {
    return <p className="essays-note">No essays published yet.</p>;
  }
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <ol className="essay-list">
      {essays.map((e) => (
        <li key={e.url}>
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            <span className="essay-title">{e.title}</span>
            <time dateTime={e.date}>{fmt.format(new Date(e.date))}</time>
          </a>
        </li>
      ))}
    </ol>
  );
}

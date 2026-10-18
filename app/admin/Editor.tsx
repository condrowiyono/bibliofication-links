"use client";

import { useEffect, useState, useTransition } from "react";
import { PLATFORMS, STORE_NAMES, STORES, type LinkItem, type Platform, type ShopItem, type Site, type Store } from "@/lib/site";
import { logoutAction, saveSiteAction } from "./actions";

type Status = { kind: "idle" } | { kind: "saved"; at: string } | { kind: "error"; errors: string[] };

const newId = () => Math.random().toString(36).slice(2, 10);
const label = (p: Platform) => p.charAt(0).toUpperCase() + p.slice(1);
const LINK_PLACEHOLDER: Record<Store, string> = { shopee: "https://s.shopee.co.id/…", tiktok: "https://vt.tokopedia.com/…" };

export function Editor({ initial }: { initial: Site }) {
  const [site, setSite] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tab, setTab] = useState<"form" | "json">("form");
  const [raw, setRaw] = useState("");
  const [rawError, setRawError] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const dirty = tab === "json" ? raw !== JSON.stringify(site, null, 2) || JSON.stringify(site) !== saved : JSON.stringify(site) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Parses the JSON tab into state. Returns the parsed site, or null when the text isn't valid JSON. */
  const readRaw = (): Site | null => {
    try {
      const parsed = JSON.parse(raw) as Site;
      setRawError("");
      setSite(parsed);
      return parsed;
    } catch (e) {
      setRawError(`That isn't valid JSON yet: ${(e as Error).message}`);
      return null;
    }
  };

  const switchTab = (next: "form" | "json") => {
    if (next === tab) return;
    if (next === "json") {
      setRaw(JSON.stringify(site, null, 2));
      setRawError("");
    } else if (!readRaw()) return;
    setTab(next);
  };

  const save = () => {
    const toSave = tab === "json" ? readRaw() : site;
    if (!toSave) return;
    startTransition(async () => {
      const res = await saveSiteAction(toSave);
      if (res.ok) {
        setSaved(JSON.stringify(toSave));
        if (tab === "json") setRaw(JSON.stringify(toSave, null, 2));
        setStatus({ kind: "saved", at: res.savedAt });
      } else {
        setStatus({ kind: "error", errors: res.errors });
      }
    });
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(site, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "links.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const setShop = (patch: Partial<Site["shop"]>) => setSite((s) => ({ ...s, shop: { ...s.shop, ...patch } }));
  const setItem = (i: number, patch: Partial<ShopItem>) =>
    setSite((s) => ({ ...s, shop: { ...s.shop, items: s.shop.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } }));
  const moveItem = (i: number, dir: -1 | 1) =>
    setSite((s) => {
      const items = [...s.shop.items];
      [items[i], items[i + dir]] = [items[i + dir], items[i]];
      return { ...s, shop: { ...s.shop, items } };
    });
  const removeItem = (i: number) => setSite((s) => ({ ...s, shop: { ...s.shop, items: s.shop.items.filter((_, j) => j !== i) } }));
  const addItem = () =>
    setSite((s) => ({
      ...s,
      shop: { ...s.shop, items: [...s.shop.items, { id: newId(), store: "shopee", title: "New product", url: "", image: "", price: "", visible: true }] },
    }));

  const setProfile = (patch: Partial<Site["profile"]>) => setSite((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const setLink = (i: number, patch: Partial<LinkItem>) =>
    setSite((s) => ({ ...s, links: s.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const moveLink = (i: number, dir: -1 | 1) =>
    setSite((s) => {
      const links = [...s.links];
      [links[i], links[i + dir]] = [links[i + dir], links[i]];
      return { ...s, links };
    });
  const removeLink = (i: number) => setSite((s) => ({ ...s, links: s.links.filter((_, j) => j !== i) }));
  const addLink = (type: LinkItem["type"]) =>
    setSite((s) => ({
      ...s,
      links: [
        ...s.links,
        type === "header"
          ? { id: newId(), type, title: "New section", visible: true }
          : { id: newId(), type, title: "New link", subtitle: "", url: "", icon: "", featured: false, visible: true },
      ],
    }));

  return (
    <>
      <header className="admin-bar">
        <h1>Manage links</h1>
        <div className="admin-bar-actions">
          <a className="btn" href="/" target="_blank" rel="noopener">
            View page
          </a>
          <form action={logoutAction}>
            <button type="submit" className="btn">
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Editing mode">
        <button role="tab" type="button" aria-selected={tab === "form"} className="tab" onClick={() => switchTab("form")}>
          Form
        </button>
        <button role="tab" type="button" aria-selected={tab === "json"} className="tab" onClick={() => switchTab("json")}>
          JSON
        </button>
      </div>

      {tab === "json" ? (
        <section className="panel" aria-label="Raw JSON">
          <p className="admin-note">The whole page is this one JSON document. Edit it directly, then save.</p>
          <textarea className="json" spellCheck={false} value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Page JSON" />
          {rawError && (
            <p className="admin-error" role="alert">
              {rawError}
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="panel" aria-labelledby="h-profile">
            <h2 id="h-profile">Profile</h2>
            <div className="grid-2">
              <Field label="Name" value={site.profile.name} onChange={(v) => setProfile({ name: v })} />
              <Field label="Handle" value={site.profile.handle} onChange={(v) => setProfile({ handle: v })} />
            </div>
            <Field label="Photo URL" value={site.profile.avatar} onChange={(v) => setProfile({ avatar: v })} placeholder="https://…" />
            <Field label="Bio" value={site.profile.bio} onChange={(v) => setProfile({ bio: v })} multiline />
            <ShelfField shelf={site.profile.shelf} onChange={(shelf) => setProfile({ shelf })} />
            <Field label="Footer line" value={site.footer} onChange={(v) => setSite((s) => ({ ...s, footer: v }))} />
          </section>

          <section className="panel" aria-labelledby="h-socials">
            <h2 id="h-socials">Icon row</h2>
            <p className="admin-note">The round icons under the bio.</p>
            {site.socials.length === 0 && <p className="admin-note">No icons yet. Add one below.</p>}
            {site.socials.map((so, i) => (
              <div className="row" key={i}>
                <label className="field field-narrow">
                  <span>Platform</span>
                  <select
                    value={so.platform}
                    onChange={(e) =>
                      setSite((s) => ({ ...s, socials: s.socials.map((x, j) => (j === i ? { ...x, platform: e.target.value as Platform } : x)) }))
                    }
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {label(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="URL"
                  value={so.url}
                  placeholder="https://…"
                  onChange={(v) => setSite((s) => ({ ...s, socials: s.socials.map((x, j) => (j === i ? { ...x, url: v } : x)) }))}
                />
                <button type="button" className="btn btn-quiet" onClick={() => setSite((s) => ({ ...s, socials: s.socials.filter((_, j) => j !== i) }))}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => setSite((s) => ({ ...s, socials: [...s.socials, { platform: "instagram", url: "" }] }))}>
              Add icon
            </button>
          </section>

          <section className="panel" aria-labelledby="h-shop">
            <h2 id="h-shop">Shop picks</h2>
            <p className="admin-note">
              Each product is one Shopee or TikTok Shop affiliate link, shown as a photo card near the top of the page. For the photo, open the product
              in the store, right-click the main image and copy its address.
            </p>
            <div className="row">
              <Field label="Section title" value={site.shop.title} onChange={(v) => setShop({ title: v })} />
            </div>
            {STORES.map((st) => (
              <Field
                key={st}
                label={`${STORE_NAMES[st]} store link (optional, shown as a green button)`}
                value={site.shop.stores[st]}
                placeholder={LINK_PLACEHOLDER[st]}
                onChange={(v) => setShop({ stores: { ...site.shop.stores, [st]: v } })}
              />
            ))}
            {site.shop.items.length === 0 && <p className="admin-note">No products yet. Add one below, then paste its affiliate link.</p>}
            <ol className="link-list">
              {site.shop.items.map((it, i) => (
                <li key={it.id} className="link-item product-item">
                  <div className="link-item-top">
                    <strong>{STORE_NAMES[it.store]} product</strong>
                    {!it.url && <span className="flag">Hidden: needs a link</span>}
                    {!it.visible && <span className="flag">Hidden</span>}
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label={`Move "${it.title}" up`}>
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => moveItem(i, 1)}
                      disabled={i === site.shop.items.length - 1}
                      aria-label={`Move "${it.title}" down`}
                    >
                      Down
                    </button>
                    <button type="button" className="btn btn-quiet btn-danger" onClick={() => removeItem(i)} aria-label={`Delete "${it.title}"`}>
                      Delete
                    </button>
                  </div>
                  <div className="product-edit">
                    <span className="thumb">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- preview of a pasted URL
                        <img src={it.image} alt="" />
                      ) : (
                        <span>No photo</span>
                      )}
                    </span>
                    <div className="product-fields">
                      <div className="row">
                        <Field label="Product name" value={it.title} onChange={(v) => setItem(i, { title: v })} />
                        <label className="field field-narrow">
                          <span>Store</span>
                          <select value={it.store} onChange={(e) => setItem(i, { store: e.target.value as Store })}>
                            {STORES.map((st) => (
                              <option key={st} value={st}>
                                {STORE_NAMES[st]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Field label="Affiliate link" value={it.url} placeholder={LINK_PLACEHOLDER[it.store]} onChange={(v) => setItem(i, { url: v })} />
                      <div className="row">
                        <Field label="Photo URL" value={it.image ?? ""} placeholder="https://…" onChange={(v) => setItem(i, { image: v })} />
                        <label className="field field-narrow">
                          <span>Price (optional)</span>
                          <input type="text" value={it.price ?? ""} placeholder="Rp 89.000" onChange={(e) => setItem(i, { price: e.target.value })} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="checks">
                    <label>
                      <input type="checkbox" checked={it.visible} onChange={(e) => setItem(i, { visible: e.target.checked })} /> Show on page
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="btn" onClick={addItem}>
              Add product
            </button>
          </section>

          <section className="panel" aria-labelledby="h-links">
            <h2 id="h-links">Links</h2>
            <p className="admin-note">Shown top to bottom. A link without a URL stays hidden from the page until you add one.</p>
            {site.links.length === 0 && <p className="admin-note">No links yet. Add your first one below.</p>}
            <ol className="link-list">
              {site.links.map((l, i) => (
                <li key={l.id} className={`link-item${l.type === "header" ? " link-item-header" : ""}`}>
                  <div className="link-item-top">
                    <strong>{l.type === "header" ? "Section heading" : "Link"}</strong>
                    {l.type === "link" && !l.url && <span className="flag">Hidden: needs a URL</span>}
                    {!l.visible && <span className="flag">Hidden</span>}
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={() => moveLink(i, -1)} disabled={i === 0} aria-label={`Move "${l.title}" up`}>
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => moveLink(i, 1)}
                      disabled={i === site.links.length - 1}
                      aria-label={`Move "${l.title}" down`}
                    >
                      Down
                    </button>
                    <button type="button" className="btn btn-quiet btn-danger" onClick={() => removeLink(i)} aria-label={`Delete "${l.title}"`}>
                      Delete
                    </button>
                  </div>
                  <Field label="Title" value={l.title} onChange={(v) => setLink(i, { title: v })} />
                  {l.type === "link" && (
                    <>
                      <Field label="Subtitle" value={l.subtitle ?? ""} onChange={(v) => setLink(i, { subtitle: v })} />
                      <div className="row">
                        <Field label="URL" value={l.url ?? ""} placeholder="https://…" onChange={(v) => setLink(i, { url: v })} />
                        <label className="field field-narrow">
                          <span>Icon</span>
                          <select value={l.icon ?? ""} onChange={(e) => setLink(i, { icon: e.target.value as Platform | "" })}>
                            <option value="">First letter</option>
                            {PLATFORMS.map((p) => (
                              <option key={p} value={p}>
                                {label(p)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </>
                  )}
                  <div className="checks">
                    <label>
                      <input type="checkbox" checked={l.visible} onChange={(e) => setLink(i, { visible: e.target.checked })} /> Show on page
                    </label>
                    {l.type === "link" && (
                      <label>
                        <input type="checkbox" checked={Boolean(l.featured)} onChange={(e) => setLink(i, { featured: e.target.checked })} /> Featured
                        (green card)
                      </label>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => addLink("link")}>
                Add link
              </button>
              <button type="button" className="btn" onClick={() => addLink("header")}>
                Add section heading
              </button>
            </div>
          </section>

          <section className="panel" aria-labelledby="h-medium">
            <h2 id="h-medium">Latest essays from Medium</h2>
            <div className="row">
              <Field
                label="Medium username (without @)"
                value={site.medium.username}
                onChange={(v) => setSite((s) => ({ ...s, medium: { ...s.medium, username: v.replace(/^@/, "") } }))}
              />
              <label className="field field-narrow">
                <span>How many</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={site.medium.count}
                  onChange={(e) => setSite((s) => ({ ...s, medium: { ...s.medium, count: Number(e.target.value) } }))}
                />
              </label>
            </div>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={site.medium.show}
                  onChange={(e) => setSite((s) => ({ ...s, medium: { ...s.medium, show: e.target.checked } }))}
                />{" "}
                Show on page
              </label>
            </div>
          </section>
        </>
      )}

      <div className="savebar">
        <div className="savebar-status" role="status" aria-live="polite">
          {status.kind === "error" ? (
            <ul className="admin-error">
              {status.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : dirty ? (
            <span>Unsaved changes</span>
          ) : status.kind === "saved" ? (
            <span>Saved at {new Date(status.at).toLocaleTimeString()}. Mischief managed.</span>
          ) : (
            <span>All changes saved</span>
          )}
        </div>
        <button type="button" className="btn" onClick={download}>
          Download JSON
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

/** Keeps the typed text as-is so a trailing comma survives while the next word is being typed. */
function ShelfField({ shelf, onChange }: { shelf: string[]; onChange: (shelf: string[]) => void }) {
  const [text, setText] = useState(shelf.join(", "));
  return (
    <Field
      label="Shelf (comma separated, one book spine each; drinks like Matcha or Tea become a cup)"
      value={text}
      onChange={(v) => {
        setText(v);
        onChange(v.split(",").map((w) => w.trim()).filter(Boolean));
      }}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

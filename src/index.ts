declare const opaque: unique symbol;

/** What `fingerprint` records about an element. Its contents are private: pass it to `find`. */
export interface Fingerprint {
  readonly [opaque]: true;
}

export interface FingerprintOptions {
  /** The name an element must keep to count as the same element. Defaults to its `aria-label`, or else its text. */
  name?: (el: Element) => string;
}

interface Print {
  /** Weak, so a stored fingerprint does not keep a replaced element, and the old page around it, in memory. */
  el: WeakRef<Element>;
  id: string;
  path: number[];
  tag: string;
  name: string;
  nameOf: (el: Element) => string;
}

const label = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();

/** Still on the page, inside root, not disabled, and not hidden from people by `inert` or `aria-hidden="true"`. */
const usable = (el: Element | null | undefined, root: Element): el is HTMLElement | SVGElement =>
  !!el && el.isConnected && root.contains(el) && !el.matches(":disabled") && !el.closest("[inert], [aria-hidden='true']");

/**
 * Records an element inside root: the element itself, its id, its index path from root, its tag and its name.
 * Undefined when there is no element, or it is root itself, or it is not inside root.
 */
export function fingerprint(el: Element | null | undefined, root: Element | null | undefined, options: FingerprintOptions = {}): Fingerprint | undefined {
  if (!el || !root || el === root || !root.contains(el)) return undefined;
  const nameOf = options.name ?? label;
  const path: number[] = [];
  for (let at = el; at !== root; at = at.parentElement!) path.unshift([...at.parentElement!.children].indexOf(at));
  const print: Print = { el: new WeakRef(el), id: el.id, path, tag: el.tagName, name: nameOf(el), nameOf };
  return print as unknown as Fingerprint;
}

/**
 * The element a fingerprint recorded: the element itself while it is still usable inside root. Once it has been
 * replaced, the element in root with the same id, or else at the same index path, or else the only one in root, as long
 * as its tag and name match. Undefined when the element is really gone, or look-alikes make it unclear.
 */
export function find(print: Fingerprint | undefined, root: Element | null | undefined): HTMLElement | SVGElement | undefined {
  const p = print as unknown as Print | undefined;
  if (!p || !root) return undefined;
  const recorded = p.el.deref();
  if (usable(recorded, root)) return recorded;
  const same = (el: Element | null | undefined) => (el && el.tagName === p.tag && p.nameOf(el) === p.name && usable(el, root) ? el : undefined);
  // Compared directly, so an id needs no escaping, and only ids inside root count.
  const byId = p.id ? [...root.querySelectorAll("[id]")].find((el) => el.id === p.id) : undefined;
  let at: Element | undefined = root;
  for (const i of p.path) at = at?.children[i];
  const found = same(byId) ?? same(at);
  if (found) return found;
  // A new row above or a sort moves the path. Look anywhere, but never guess between look-alikes.
  const [only, other] = [...root.querySelectorAll("*")].flatMap((el) => same(el) ?? []);
  return other ? undefined : only;
}

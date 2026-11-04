declare const opaque: unique symbol;

/** What `fingerprint` records about an element. Its contents are private: pass it to `find`. */
export interface Fingerprint {
  readonly [opaque]: true;
}

export interface FingerprintOptions {
  /** The name an element must keep to count as the same element. Defaults to its `aria-label`, or else its text. */
  name?: (el: Element) => string;
}

export interface FindOptions {
  /**
   * When nothing matches, return the nearest element that can take focus, or holds one, instead: from the
   * deepest level of its index path that is still there up to root, the sibling now at its old index, then the one
   * before it. Else root itself.
   */
  fallback?: boolean;
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

const focusable = "[tabindex], a[href], button, input, select, textarea";

const byId = (root: Element, id: string) => {
  if (!root.isConnected) return; // Nothing in it is usable.
  const hit = (root.getRootNode() as Document | ShadowRoot).getElementById(id);
  if (!hit || root.contains(hit)) return hit ?? undefined;
  // Also used earlier, outside root. Compared, so the id needs no escaping.
  for (const el of root.querySelectorAll("[id]")) if (el.id === id) return el;
};

/**
 * Records an element inside root: the element itself, its id, its index path from root, its tag and its name.
 * Undefined when there is no element, or it is root itself, or it is not inside root.
 */
export function fingerprint(el: Element | null | undefined, root: Element | null | undefined, options: FingerprintOptions = {}): Fingerprint | undefined {
  if (!el || !root || el === root || !root.contains(el)) return undefined;
  const nameOf = options.name ?? label;
  const path: number[] = [];
  for (let at = el; at !== root; at = at.parentElement!) {
    let i = 0;
    for (let s = at.previousElementSibling; s; s = s.previousElementSibling) i++;
    path.push(i);
  }
  path.reverse();
  const print: Print = { el: new WeakRef(el), id: el.id, path, tag: el.tagName, name: nameOf(el), nameOf };
  return print as unknown as Fingerprint;
}

/**
 * The element a fingerprint recorded: the element itself while it is still usable inside root. Once it has been
 * replaced, the element in root with the same id, or else at the same index path, or else the only one in root, as long
 * as its tag and name match. Undefined when the element is really gone, or look-alikes make it unclear, unless
 * `options.fallback` is set.
 */
export function find(print: Fingerprint | undefined, root: Element | null | undefined, options: FindOptions = {}): HTMLElement | SVGElement | undefined {
  const p = print as unknown as Print | undefined;
  if (!p || !root) return undefined;
  const recorded = p.el.deref();
  if (usable(recorded, root)) return recorded;
  const same = (el: Element | null | undefined) => (el && el.tagName === p.tag && p.nameOf(el) === p.name && usable(el, root) ? el : undefined);
  const hit = p.id ? same(byId(root, p.id)) : undefined;
  if (hit) return hit;
  const at: (Element | undefined)[] = [root];
  p.path.forEach((i, k) => (at[k + 1] = at[k]?.children[i]));
  const found = same(at[p.path.length]);
  if (found) return found;
  // Last, anywhere in root, but never guess between look-alikes.
  const [only, other] = [...root.querySelectorAll("*")].flatMap((el) => same(el) ?? []);
  const alike = other ? undefined : only;
  if (alike || !options.fallback) return alike;
  // Deepest level first: the sibling now at the old index, then the one before it, or an element inside either.
  for (let k = p.path.length; k--; )
    for (const el of [at[k]?.children[p.path[k]!], at[k]?.children[p.path[k]! - 1]])
      for (const c of el ? [el, ...el.querySelectorAll(focusable)] : []) if (c.matches(focusable) && usable(c, root)) return c;
  return usable(root, root) ? root : undefined;
}

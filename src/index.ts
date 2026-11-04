declare const opaque: unique symbol;

/** What `fingerprint` records about an element. Its contents are private: pass it to `find`. */
export interface Fingerprint {
  readonly [opaque]: true;
}

export interface FingerprintOptions {
  /** The name an element must keep to count as the same element. Defaults to its `aria-label`, or else its text. */
  name?: (el: Element) => string;
  /**
   * An attribute, such as `data-key`, whose value names a row of a list and stays the same when the list is drawn again.
   * The nearest element from el up to root with a non-empty value is the row, so the row is found again after rows
   * are inserted, removed or reordered.
   */
  key?: string;
}

interface Print {
  /** Weak, so a stored fingerprint does not keep a replaced element, and the old page around it, in memory. */
  el: WeakRef<Element>;
  id: string;
  path: number[];
  tag: string;
  name: string;
  nameOf: (el: Element) => string;
  /** A selector for the nearest keyed ancestor, and the index path from it to the element. */
  row?: [selector: string, path: number[]];
}

const walk = (at: Element | null | undefined, path: number[]) => path.reduce<Element | null | undefined>((at, i) => at?.children[i], at);

const label = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();

/** Still on the page, inside root, not disabled, and not hidden from people by `inert` or `aria-hidden="true"`. */
const usable = (el: Element | null | undefined, root: Element): el is HTMLElement | SVGElement =>
  !!el && el.isConnected && root.contains(el) && !el.matches(":disabled") && !el.closest("[inert], [aria-hidden='true']");

/**
 * Records an element inside root: the element itself, its id, its key, its index path from root, its tag and its name.
 * Undefined when there is no element, or it is root itself, or it is not inside root.
 */
export function fingerprint(el: Element | null | undefined, root: Element | null | undefined, options: FingerprintOptions = {}): Fingerprint | undefined {
  if (!el || !root || el === root || !root.contains(el)) return undefined;
  const nameOf = options.name ?? label;
  const path: number[] = [];
  let row: Print["row"];
  for (let at = el; at !== root; at = at.parentElement!) {
    const key = !row && options.key && at.getAttribute(options.key);
    if (key) row = [`[${CSS.escape(options.key!)}="${CSS.escape(key)}"]`, [...path]];
    path.unshift([...at.parentElement!.children].indexOf(at));
  }
  const print: Print = { el: new WeakRef(el), id: el.id, path, tag: el.tagName, name: nameOf(el), nameOf, row };
  return print as unknown as Fingerprint;
}

/**
 * The element a fingerprint recorded: the element itself while it is still usable inside root. Once it has been
 * replaced, the element in root with the same id, or else under the same key, or else at the same index path, as
 * long as its tag and name match.
 * Undefined when the element is really gone.
 */
export function find(print: Fingerprint | undefined, root: Element | null | undefined): HTMLElement | SVGElement | undefined {
  const p = print as unknown as Print | undefined;
  if (!p || !root) return undefined;
  const recorded = p.el.deref();
  if (usable(recorded, root)) return recorded;
  const same = (el: Element | null | undefined) => (el && el.tagName === p.tag && p.nameOf(el) === p.name && usable(el, root) ? el : undefined);
  // Compared directly, so an id needs no escaping, and only ids inside root count.
  const byId = p.id ? [...root.querySelectorAll("[id]")].find((el) => el.id === p.id) : undefined;
  return same(byId) ?? same(p.row && walk(root.querySelector(p.row[0]), p.row[1])) ?? same(walk(root, p.path));
}

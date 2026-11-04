declare const opaque: unique symbol;

/** What `fingerprint` records about an element. Its contents are private: pass it to `find` or `restore`. */
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
  /** The caret and selection of an input or textarea: start, end and direction. */
  sel?: [number, number, "forward" | "backward" | "none"];
  /** A selector for the nearest keyed ancestor, and the index path from it to the element. */
  row?: [selector: string, path: number[]];
}

const walk = (at: Element | null | undefined, path: number[]) => path.reduce<Element | null | undefined>((at, i) => at?.children[i], at);

const label = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();

/** Still on the page, inside root, not disabled, and not hidden from people by `inert` or `aria-hidden="true"`. */
const usable = (el: Element | null | undefined, root: Element): el is HTMLElement | SVGElement =>
  !!el && el.isConnected && root.contains(el) && !el.matches(":disabled") && !el.closest("[inert], [aria-hidden='true']");

const byId = (root: Element, id: string) => {
  if (!root.isConnected) return; // Nothing in it is usable.
  const hit = (root.getRootNode() as Document | ShadowRoot).getElementById(id);
  if (!hit || root.contains(hit)) return hit ?? undefined;
  // Also used earlier, outside root. Compared, so the id needs no escaping.
  for (const el of root.querySelectorAll("[id]")) if (el.id === id) return el;
};

/**
 * Records an element inside root: the element itself, its id, its key, its index path from root, its tag and its name,
 * and the caret and selection of an input or textarea.
 * Undefined when there is no element, or it is root itself, or it is not inside root.
 */
export function fingerprint(el: Element | null | undefined, root: Element | null | undefined, options: FingerprintOptions = {}): Fingerprint | undefined {
  if (!el || !root || el === root || !root.contains(el)) return undefined;
  const nameOf = options.name ?? label;
  const path: number[] = [];
  let row: Print["row"];
  for (let at = el; at !== root; at = at.parentElement!) {
    // The first keyed element on the way up is the row. The path so far, reversed, leads from it to el.
    const key = !row && options.key && at.getAttribute(options.key);
    if (key) row = [`[${CSS.escape(options.key!)}="${CSS.escape(key)}"]`, [...path].reverse()];
    let i = 0;
    for (let s = at.previousElementSibling; s; s = s.previousElementSibling) i++;
    path.push(i);
  }
  path.reverse();
  const print: Print = { el: new WeakRef(el), id: el.id, path, tag: el.tagName, name: nameOf(el), nameOf, row };
  const text = el as HTMLInputElement;
  try {
    // Undefined when el is not an input or textarea. Null, or a throw in some browsers, for an input with no caret.
    if (text.selectionStart != null) print.sel = [text.selectionStart, text.selectionEnd!, text.selectionDirection!];
  } catch {}
  return print as unknown as Fingerprint;
}

/**
 * The element a fingerprint recorded: the element itself while it is still usable inside root. Once it has been
 * replaced, the element in root with the same id, or else under the same key, or else at the same index path, or else
 * the only one in root, as long as its tag and name match. Undefined when the element is really gone, or look-alikes
 * make it unclear.
 */
export function find(print: Fingerprint | undefined, root: Element | null | undefined): HTMLElement | SVGElement | undefined {
  const p = print as unknown as Print | undefined;
  if (!p || !root) return undefined;
  const recorded = p.el.deref();
  if (usable(recorded, root)) return recorded;
  const same = (el: Element | null | undefined) => (el && el.tagName === p.tag && p.nameOf(el) === p.name && usable(el, root) ? el : undefined);
  const hit = p.id ? same(byId(root, p.id)) : undefined;
  if (hit) return hit;
  const keyed = same(p.row && walk(root.querySelector(p.row[0]), p.row[1]));
  if (keyed) return keyed;
  const found = same(walk(root, p.path));
  if (found) return found;
  // Last, anywhere in root, but never guess between look-alikes.
  const [only, other] = [...root.querySelectorAll("*")].flatMap((el) => same(el) ?? []);
  return other ? undefined : only;
}

/**
 * Focuses what `find` returns, without scrolling, and returns it. If that is a new input or textarea in place of the
 * recorded one, also puts back the caret and selection, cut to the new value's length. The recorded one keeps its own.
 */
export function restore(print: Fingerprint | undefined, root: Element | null | undefined): HTMLElement | SVGElement | undefined {
  const el = find(print, root);
  const p = print as unknown as Print | undefined;
  el?.focus({ preventScroll: true });
  try {
    // Throws when the new input's type has no caret, such as a checkbox.
    if (p?.sel && el !== p.el.deref()) (el as HTMLInputElement | undefined)?.setSelectionRange(...p.sel);
  } catch {}
  return el;
}

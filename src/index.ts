declare const opaque: unique symbol;

/** What `fingerprint` records about an element. Its contents are private: pass it to `find` or `restore`. */
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
  /** The caret and selection of an input or textarea: start, end and direction. */
  sel?: [number, number, "forward" | "backward" | "none"];
}

const label = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();

/** Still on the page, inside root, not disabled, and not hidden from people by `inert` or `aria-hidden="true"`. */
const usable = (el: Element | null | undefined, root: Element): el is HTMLElement | SVGElement =>
  !!el && el.isConnected && root.contains(el) && !el.matches(":disabled") && !el.closest("[inert], [aria-hidden='true']");

/**
 * Records an element inside root: the element itself, its id, its index path from root, its tag and its name, and the
 * caret and selection of an input or textarea.
 * Undefined when there is no element, or it is root itself, or it is not inside root.
 */
export function fingerprint(el: Element | null | undefined, root: Element | null | undefined, options: FingerprintOptions = {}): Fingerprint | undefined {
  if (!el || !root || el === root || !root.contains(el)) return undefined;
  const nameOf = options.name ?? label;
  const path: number[] = [];
  for (let at = el; at !== root; at = at.parentElement!) path.unshift([...at.parentElement!.children].indexOf(at));
  const print: Print = { el: new WeakRef(el), id: el.id, path, tag: el.tagName, name: nameOf(el), nameOf };
  const text = el as HTMLInputElement;
  try {
    // Undefined when el is not an input or textarea. Null, or a throw in some browsers, for an input with no caret.
    if (text.selectionStart != null) print.sel = [text.selectionStart, text.selectionEnd!, text.selectionDirection!];
  } catch {}
  return print as unknown as Fingerprint;
}

/**
 * The element a fingerprint recorded: the element itself while it is still usable inside root. Once it has been
 * replaced, the element in root with the same id, or else at the same index path, as long as its tag and name match.
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
  let at: Element | undefined = root;
  for (const i of p.path) at = at?.children[i];
  return same(byId) ?? same(at);
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
    if (el && p?.sel && el !== p.el.deref()) (el as HTMLInputElement).setSelectionRange(...p.sel);
  } catch {}
  return el;
}

# focus-fingerprint

Find the element that had focus again after its part of the page is drawn again.

When a screen, a list or a panel is drawn again (a router swaps it, a keyed component remounts, a list is fetched again), the element that had focus is replaced by a new node. Code that stored the old node to give focus back finds it detached, focus falls to the `body`, and keyboard and screen reader users lose their place.

`fingerprint` records the element, its id, where it sits inside a root, its tag and its name. `find` returns the element itself while it is still there, or else the new element in the same place with the same tag and name. No dependencies, under 1 KB gzipped.

## Install

```bash
npm install focus-fingerprint
```

## Example

```ts
import { find, fingerprint } from "focus-fingerprint";

// Before the panel goes away, remember what had focus inside it.
const opener = fingerprint(document.activeElement, panel);

// ...the panel comes back as a new copy...

(find(opener, panel) ?? panel.querySelector("h1"))?.focus({ preventScroll: true });
```

`find` returns `undefined` when the element is really gone, so you choose the fallback, such as a heading or the panel itself. Or pass `{ fallback: true }` to get the element nearest to where it was, the way focus moves to the next row when a row is deleted.

The same in React, for a list whose rows are drawn again when it is fetched again:

```tsx
import { find, fingerprint, type Fingerprint } from "focus-fingerprint";

const list = useRef<HTMLUListElement>(null);
const opener = useRef<Fingerprint | undefined>(undefined);

const refresh = async () => {
  opener.current = fingerprint(document.activeElement, list.current);
  setRows(await load());
};

useLayoutEffect(() => {
  // A row that is gone gives its neighbour, or the list itself (give it tabindex="-1") once the list is empty.
  find(opener.current, list.current, { fallback: true })?.focus({ preventScroll: true });
  opener.current = undefined;
}, [rows]);
```

## API

### `fingerprint(el, root, options?)`

Records `el`, which must be inside `root`. Returns a `Fingerprint`, whose contents are private, or `undefined` when `el` is missing, is `root` itself, or is not inside `root`.

- `el`: `Element | null | undefined`, usually `document.activeElement`.
- `root`: `Element | null | undefined`, the part of the page that will be drawn again.
- `options.name`: `(el: Element) => string`, the name an element must keep to count as the same element. Defaults to its `aria-label`, or else its text, trimmed. Pass your own to match on something else, such as a `data-` attribute.

### `find(print, root, options?)`

Returns the recorded element, or `undefined`:

1. The element itself, while it is still connected, inside `root`, not disabled, and not under `inert` or `aria-hidden="true"`. A disabled element (`:disabled`, which includes one inside a disabled `<fieldset>`) cannot take focus, so it does not count. One with `aria-disabled="true"` can, so it does.
2. Otherwise the element in `root` with the same id, if it has the same tag and name and is usable.
3. Otherwise the element at the same index path from `root`, if it has the same tag and name and is usable.
4. Otherwise, only when `options.fallback` is `true`, the element nearest to where it was. From the deepest level of the old index path that is still there up to `root`, it tries the sibling now at the old index (the next item, moved up), then the one before it (for when the old item was last). For each in turn, it returns the sibling itself if it is usable and can take focus, or else the first usable element inside it that can. Else `root` itself, if it is usable.

An element can take focus here when it has a `tabindex`, or is a link with an `href`, a button, an input, a select or a textarea.

`root` may be the same node as before or a new one. The name is read with the same function the fingerprint was taken with.

The return type is `HTMLElement | SVGElement`: both have `focus()`. An element that is not focusable needs `tabindex="-1"` before you focus it.

## Licence

MIT

# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

## 0.3.0 - 2026-11-04

- `options.key` names an attribute, such as `data-key`, that marks each row of a list. `find` looks for the row with the same key before it tries the index path, so the element is found again after rows are inserted, removed or reordered, even when every row has a button with the same name.
- `find(print, root, { fallback: true })` returns the element nearest to where a gone element was, instead of `undefined`: the next item that moved into its place, else the one before it, then the same one level up, and finally `root`. It prefers an element that can take focus, or one inside it. Without the option `find` still returns `undefined`.
- `restore(print, root)` focuses what `find` returns without scrolling. When an `<input>` or `<textarea>` was drawn again while someone typed, it also puts their caret and selection back, cut to the new value's length. `fingerprint` now records the caret and selection for this.
- The published JavaScript is about 1.2 KB gzipped, up from 1 KB, to make room for these three.

## 0.2.0 - 2026-11-04

- `find` no longer returns a disabled element, which cannot take focus, so your fallback runs instead of focus falling to the `body`. An element with `aria-disabled="true"` is still returned.
- A stored fingerprint no longer keeps the recorded element, and the old page around it, in memory once that element is replaced. Needs `WeakRef` (Chrome 84, Firefox 79, Safari 14.1).
- `find` still finds the element after a row is added above it or the list is sorted again: when neither its id nor its place matches, it returns the only element in root with the same tag and name. Two or more look-alikes still give `undefined`.
- `find` looks an id up with `getElementById` instead of going through every element in root that has an id, so its cost no longer grows with the page: about 0.3 µs, where 1,000 rows took 0.2 ms and 100,000 rows took 29 ms in Chromium. It still finds the copy inside root when an earlier element outside it has the same id.
- `fingerprint` counts the siblings before each element instead of copying them, about 4 times faster in a long list.
- The published JavaScript has no comments, so it stays under 1 KB gzipped. The type declarations keep their documentation.

## 0.1.0 - 2026-11-03

- `fingerprint(el, root, options?)` records an element inside a root: the element, its id, its index path, its tag and its name.
- `find(print, root)` returns that element while it is still there, or else the element that replaced it, found by id or by place with the same tag and name. `undefined` when it is gone.
- `options.name` matches on a name of your choice instead of the `aria-label` or text.

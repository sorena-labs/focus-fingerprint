# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- `find` no longer returns a disabled element, which cannot take focus, so your fallback runs instead of focus falling to the `body`. An element with `aria-disabled="true"` is still returned.
- A stored fingerprint no longer keeps the recorded element, and the old page around it, in memory once that element is replaced. Needs `WeakRef` (Chrome 84, Firefox 79, Safari 14.1).

## 0.1.0 - 2026-11-03

- `fingerprint(el, root, options?)` records an element inside a root: the element, its id, its index path, its tag and its name.
- `find(print, root)` returns that element while it is still there, or else the element that replaced it, found by id or by place with the same tag and name. `undefined` when it is gone.
- `options.name` matches on a name of your choice instead of the `aria-label` or text.

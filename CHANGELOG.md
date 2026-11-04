# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- `find` looks an id up with `getElementById` instead of going through every element in root that has an id, so its cost no longer grows with the page: about 0.3 µs, where 1,000 rows took 0.2 ms and 100,000 rows took 29 ms in Chromium. It still finds the copy inside root when an earlier element outside it has the same id.
- `fingerprint` counts the siblings before each element instead of copying them, about 4 times faster in a long list.

## 0.1.0 - 2026-11-03

- `fingerprint(el, root, options?)` records an element inside a root: the element, its id, its index path, its tag and its name.
- `find(print, root)` returns that element while it is still there, or else the element that replaced it, found by id or by place with the same tag and name. `undefined` when it is gone.
- `options.name` matches on a name of your choice instead of the `aria-label` or text.

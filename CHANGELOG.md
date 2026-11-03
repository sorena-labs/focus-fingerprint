# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

## 0.1.0

- `fingerprint(el, root, options?)` records an element inside a root: the element, its id, its index path, its tag and its name.
- `find(print, root)` returns that element while it is still there, or else the element that replaced it, found by id or by place with the same tag and name. `undefined` when it is gone.
- `options.name` matches on a name of your choice instead of the `aria-label` or text.

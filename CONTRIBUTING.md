# Contributing

Thank you for helping. Bug reports, fixes and ideas are all welcome.

## Before you start

- **Bugs:** open an issue with the browser, the markup before and after the redraw, and what `find` returned.
- **New options or behaviour:** open an issue first, so we can agree on the API before you write it. The package does one job and stays small, so some good ideas belong in your own code instead.

## Working on it

You need Node 22 or later.

```bash
npm ci
npm test            # Vitest in jsdom
npm run typecheck
npm run build       # TypeScript into dist/
```

A pull request:

- does one thing, with a test that fails without it,
- adds a line under "Unreleased" in `CHANGELOG.md` saying what people get,
- keeps the package free of runtime dependencies,
- passes CI on Node 22 and 24.

## Releases

Maintainers move the "Unreleased" lines under a new `## X.Y.Z` heading, bump `version` in `package.json`, push the commit, then tag it `vX.Y.Z` and push the tag. The Release workflow does the rest, and stops at the first step that fails:

1. checks the tag matches `version` in `package.json`,
2. writes the release notes from that version's changelog lines, and fails if the heading is missing,
3. runs the typecheck, the tests and the build,
4. publishes to npm with provenance, through npm trusted publishing, so no npm token is stored in the repository,
5. creates the GitHub release with those notes.

Nobody publishes to npm by hand.

**One-time setup:** a maintainer adds a trusted publisher to the package's settings on npmjs.com: GitHub Actions, the `sorena-labs/focus-fingerprint` repository and the `release.yml` workflow. Until then, the publish step fails and no GitHub release is created.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

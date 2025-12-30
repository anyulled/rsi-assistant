# Changelog

## [0.2.0](https://github.com/anyulled/rsi-assistant/compare/rsi-assistant-v0.1.0...rsi-assistant-v0.2.0) (2025-12-30)


### Features

* Add GitHub Actions CI workflow, refactor `StatsStore` default, refine timer rest break logic, and clean up `App.tsx` imports and handlers. ([b5cc13e](https://github.com/anyulled/rsi-assistant/commit/b5cc13e3d9fbedad1df8f94becd91b1680e12f69))
* add Rust expert rules for agent; fix `useTimer` test formatting. ([3c54428](https://github.com/anyulled/rsi-assistant/commit/3c54428575c0df389f36ed9e90901267f65f31f2))
* Generate new Rust compilation artifacts and build outputs. ([ea9cd7b](https://github.com/anyulled/rsi-assistant/commit/ea9cd7b360fc1f710bcb91759dc333fb7808bc1b))
* Implement automated releases using GitHub Actions and release-please for version management and artifact generation. ([33f36cd](https://github.com/anyulled/rsi-assistant/commit/33f36cd8b2b6c04632441766bb9deb59d01501b3))
* Implement settings persistence and synchronization using tauri-plugin-store and introduce minor styling adjustments. ([a2dff0f](https://github.com/anyulled/rsi-assistant/commit/a2dff0f4b8e1e658301de1270cfd2eefcc2fabd4))
* reading mode ([#3](https://github.com/anyulled/rsi-assistant/issues/3)) ([569155e](https://github.com/anyulled/rsi-assistant/commit/569155e558656f016bcbdf8e3d47009ccdf18804))


### Bug Fixes

* Prevent race condition in `useTimer` test by mocking `invoke` to return null. ([0d42aca](https://github.com/anyulled/rsi-assistant/commit/0d42aca6d70a8bccc955300414e147be2bf653cf))
* resolve all ESLint code quality issues ([3b0f93c](https://github.com/anyulled/rsi-assistant/commit/3b0f93ccb02829df6dc206423314137244c2ab4c))

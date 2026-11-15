## [3.1.0](https://github.com/adamhl8/filterql/compare/v3.0.6..v3.1.0) - 2026-11-15

### ✨ Improvements

- compare string fields alphabetically and convert unknown fields per row ([6a1a38b](https://github.com/adamhl8/filterql/commit/6a1a38b2421e47b62a336b29405f4e34e92838cd) by @adamhl8)

- group operators and reject range and pattern operators on boolean fields ([f3a6162](https://github.com/adamhl8/filterql/commit/f3a616254df73e85ef00cee712015ee1a129a65e) by @adamhl8)

- fail invalid empty checks during comparison resolution ([f4771c8](https://github.com/adamhl8/filterql/commit/f4771c80d1c10ddbfaba81f61b2555f4a9d0f087) by @adamhl8)

- add stricter number parsing ([4a60a07](https://github.com/adamhl8/filterql/commit/4a60a07816e62c30c7ccf704a265c231ed6957ff) by @adamhl8)

### ⚡ Performance

- compile the filter once and cache the built comparisons ([c6497ab](https://github.com/adamhl8/filterql/commit/c6497ab183c057f2ca0367a8ed050dbd548fabd1) by @adamhl8)

### 🐛 Bug Fixes

- treat quoted operator characters as literal values ([16574e6](https://github.com/adamhl8/filterql/commit/16574e6ad3853c248bc641e4bb82a30e62b2e107) by @adamhl8)

- convert query and data values to the field type ([b685674](https://github.com/adamhl8/filterql/commit/b685674ea42d5bb77f2c78e983e7f9fed7d40e66) by @adamhl8)

- reset the lexer and parser after each query ([5054f6e](https://github.com/adamhl8/filterql/commit/5054f6ea0fea44f191df21f8f0a14ab7eea27f68) by @adamhl8)

### ⚙️ Miscellaneous Tasks

- _(deps)_ update dependencies ([de5ccb7](https://github.com/adamhl8/filterql/commit/de5ccb7266a2230a9d592b36891b11986eded1fe) by @adamhl8)

### 📚 Documentation

- update readme ([e864036](https://github.com/adamhl8/filterql/commit/e864036eb2d6a5496557315573640dff37a171e8) by @adamhl8)

## [3.0.6](https://github.com/adamhl8/filterql/compare/v3.0.5..v3.0.6) - 2026-10-26

### ⚙️ Miscellaneous Tasks

- _(deps)_ update dependencies ([829ad93](https://github.com/adamhl8/filterql/commit/829ad93a63ed25032f68f30629469acdead1cd6e) by @adamhl8)

## [3.0.5](https://github.com/adamhl8/filterql/compare/v3.0.4..v3.0.5) - 2026-09-22

### ⚙️ Miscellaneous Tasks

- _(deps)_ update dependencies ([6239053](https://github.com/adamhl8/filterql/commit/6239053ae542b9ffb61c73d1cec80a0d8267af0c) by @adamhl8)

- _(tsdown)_ remove failOnWarn override ([389282b](https://github.com/adamhl8/filterql/commit/389282b671b741442b2839560dc9d42f2fab55d2) by @adamhl8)

## [3.0.4](https://github.com/adamhl8/filterql/compare/v3.0.3..v3.0.4) - 2026-07-13

### ⚙️ Miscellaneous Tasks

- _(deps)_ update dependencies ([0dae142](https://github.com/adamhl8/filterql/commit/0dae142dc7d09df26c09dd881f340081e7a8c753) by @adamhl8)

- _(deps)_ update dependencies ([8e41a84](https://github.com/adamhl8/filterql/commit/8e41a84e390359d121e62b6ced97f9fe53e9a46a) by @adamhl8)

- update tooling ([485db0f](https://github.com/adamhl8/filterql/commit/485db0f6b08f7a43815fb9a934f7ff389fc1aee9) by @adamhl8)

- add justfile ([c949b28](https://github.com/adamhl8/filterql/commit/c949b28c0b1a780cf3403936adb0705e6691bdb1) by @adamhl8)

- _(deps)_ update dependencies ([076c247](https://github.com/adamhl8/filterql/commit/076c2475c4a6917f940e288d6a2f0250509a8df5) by @adamhl8 in [#19](https://github.com/adamhl8/filterql/pull/19))

- cleanup configs ([dba364c](https://github.com/adamhl8/filterql/commit/dba364c29f3682ace709411ec8373af02f47c16c) by @adamhl8)

- add release workflow ([37afbf7](https://github.com/adamhl8/filterql/commit/37afbf70382e5f47873280df7acd7c565ae90522) by @adamhl8)

- _(deps)_ update deps ([d424b14](https://github.com/adamhl8/filterql/commit/d424b140e15b0ee94ad0d15cfc20ff7c4cd847cb) by @adamhl8)

- fix bump-deps script ([76658e1](https://github.com/adamhl8/filterql/commit/76658e1586f3c661d7e054efaf323e72c0dcfd58) by @adamhl8)

- add workflows ([ae1f7a5](https://github.com/adamhl8/filterql/commit/ae1f7a5888a69023b28af512487bb360ffb67056) by @adamhl8)

### 📚 Documentation

- fix readme ([d2f8ac1](https://github.com/adamhl8/filterql/commit/d2f8ac1e59e604e97a46d66d9c3432634b96c5e8) by @adamhl8)

- add changelog ([35abe12](https://github.com/adamhl8/filterql/commit/35abe120a47b3f8419a015975fe3ecc483af9106) by @adamhl8)

## [3.0.3](https://github.com/adamhl8/filterql/compare/v3.0.2..v3.0.3) - 2026-06-29

### ⚙️ Miscellaneous Tasks

- lint and code cleanup ([066b428](https://github.com/adamhl8/filterql/commit/066b428661512c3306c847dccb57d9828b7a9628) by @adamhl8)

## [2.0.1](https://github.com/adamhl8/filterql/compare/v1.3.1..v2.0.1) - 2025-08-24

### 🚀 Features

- operations ([baf2a8f](https://github.com/adamhl8/filterql/commit/baf2a8f7cb94bf8da0e777805f0fbd7ada2584a0) by @adamhl8)

## [1.0.0] - 2025-08-14

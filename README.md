# MeshVault

> Disclaimer: Do not use in any production like environment until the first version has been released. There **WILL** be breaking changes and no migration guides. You have been warned. Have fun.

A blazingly fast and simple self-hosted 3D files platform written in rust and typescript centered around a 3D model packaging format.

```bash
cargo run # run backend
cargo install typeshare-cli # install typeshare
typeshare ./backend --lang=typescript --output-file=frontend/bindings.ts # used to generate ts types from rust, needed before npm run dev
npm run dev # run frontend
cargo fmt # format backend
npm run lint # lint frontend
npm run lint:fix # lint and fix frontend
npm run format # format frontend
```

precommit

```bash
typeshare ./backend --lang=typescript --output-file=frontend/bindings.ts
cargo fmt
cargo build --release
npm run precommit
```

See [diesel getting started](https://diesel.rs/guides/getting-started) for the ORM.

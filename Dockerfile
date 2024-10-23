FROM rust:1.82-bookworm as rust-builder

RUN cargo install typeshare-cli

WORKDIR /code
COPY Cargo.toml Cargo.lock diesel.toml ./
RUN cargo fetch

COPY backend/ backend/
RUN cargo build --release
RUN typeshare ./backend --lang=typescript --output-file=bindings.ts

FROM node:22-bookworm as node-builder

WORKDIR /code
COPY package.json package-lock.json ./
RUN npm install

COPY index.html postcss.config.js tailwind.config.js tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts ./
COPY frontend/ frontend/ 


COPY --from=rust-builder /code/bindings.ts /code/backend/bindings.ts
RUN npm run build

FROM debian:bookworm

ENV DATABASE_URL /meshvault/data/db.sqlite3
ENV LIBRARIES_PATH /meshvault/3dassets
ENV HOST "0.0.0.0:3000"

WORKDIR /meshvault
RUN mkdir data

COPY --from=node-builder /code/dist /meshvault/dist
COPY --from=rust-builder /code/target/release/meshvault /meshvault/meshvault

RUN chown -R 1000:1000 /meshvault
USER 1000

EXPOSE 3000

ENTRYPOINT [ "./meshvault" ]

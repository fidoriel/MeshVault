FROM --platform=$BUILDPLATFORM rust:1.84-bookworm AS rust-builder

RUN apt-get update -y && apt-get install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu gcc-x86-64-linux-gnu libc6-dev-arm64-cross -y

RUN apt-get install -y cmake pkg-config

RUN rustup target add x86_64-unknown-linux-gnu 
RUN rustup target add aarch64-unknown-linux-gnu

WORKDIR /code
COPY Cargo.toml Cargo.lock diesel.toml ./
COPY .cargo/config.toml .cargo/config.toml

# hack to faster CI build with cache
RUN mkdir backend && echo "fn main() {}" > backend/main.rs

RUN cargo fetch --locked

ARG TARGETPLATFORM

# hack to faster CI build with cache
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        dpkg --add-architecture arm64 && \
        apt-get update -y && \
        apt-get install -y libsqlite3-dev:arm64 libfreetype6-dev:arm64 libfontconfig1-dev:arm64 libexpat1-dev:arm64 libocct-data-exchange-dev:arm64 && \
        export PKG_CONFIG_SYSROOT_DIR=/usr/aarch64-linux-gnu && \
        export PKG_CONFIG_PATH=/usr/aarch64-linux-gnu/lib/pkgconfig && \
        export TARGET_CHAIN=aarch64-unknown-linux-gnu; \
    elif [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
        dpkg --add-architecture amd64 && \
        apt-get update -y && \
        apt-get install -y libsqlite3-dev:amd64 libfreetype6-dev:amd64 libfontconfig1-dev:amd64 libexpat1-dev:amd64 libocct-data-exchange-dev:amd64 && \
        export PKG_CONFIG_SYSROOT_DIR=/usr/x86_64-linux-gnu && \
        export PKG_CONFIG_PATH=/usr/x86_64-linux-gnu/lib/pkgconfig && \
        export TARGET_CHAIN=x86_64-unknown-linux-gnu; \
    fi && \
    cargo build --release --locked --target $TARGET_CHAIN && \
    rm backend/main.rs

COPY backend/ backend/
COPY migrations/ migrations/

RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        export PKG_CONFIG_SYSROOT_DIR=/usr/aarch64-linux-gnu && \
        export PKG_CONFIG_PATH=/usr/aarch64-linux-gnu/lib/pkgconfig && \
        export TARGET_CHAIN=aarch64-unknown-linux-gnu; \
        rm target/$TARGET_CHAIN/release/meshvault; \
    elif [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
        export PKG_CONFIG_SYSROOT_DIR=/usr/x86_64-linux-gnu && \
        export PKG_CONFIG_PATH=/usr/x86_64-linux-gnu/lib/pkgconfig && \
        export TARGET_CHAIN=x86_64-unknown-linux-gnu; \
        rm target/$TARGET_CHAIN/release/meshvault; \
    fi && \
    cargo build --release --locked --target $TARGET_CHAIN && \
    mv target/$TARGET_CHAIN/release/meshvault .



FROM --platform=$BUILDPLATFORM rust:1.84-bookworm AS rust-bindings-builder

COPY Cargo.toml typeshare.toml ./
RUN cargo install typeshare-cli
WORKDIR /code
COPY backend/ backend/
RUN typeshare ./backend --lang=typescript --output-file=bindings.ts



FROM --platform=$BUILDPLATFORM node:22-bookworm AS node-builder
WORKDIR /code
COPY package.json package-lock.json ./
RUN npm install

COPY index.html postcss.config.js tailwind.config.js tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts ./
COPY public/ public/ 
COPY frontend/ frontend/ 

COPY --from=rust-bindings-builder /code/bindings.ts /code/frontend/bindings.ts
RUN npm run build



FROM debian:bookworm-slim AS target-image

ENV DATABASE_URL=/meshvault/data/db.sqlite3
ENV LIBRARIES_PATH=/meshvault/3dassets
ENV HOST="0.0.0.0"
ENV PORT="51100"

RUN apt-get update && \
    apt-get install -y sqlite3 && \
    apt-get install -y libosmesa6-dev libfreetype6 libfontconfig1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /meshvault
RUN mkdir data

COPY --from=node-builder /code/dist /meshvault/dist
COPY --from=rust-builder /code/meshvault /meshvault/meshvault

RUN chown -R 1000:1000 /meshvault
USER 1000
EXPOSE 51100
CMD [ "./meshvault" ]

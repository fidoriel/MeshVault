FROM --platform=$BUILDPLATFORM rust:1.82-bookworm AS rust-builder

RUN apt-get update -y && apt-get install gcc-aarch64-linux-gnu gcc-x86-64-linux-gnu -y;

RUN rustup target add x86_64-unknown-linux-gnu 
RUN rustup target add aarch64-unknown-linux-gnu

WORKDIR /code
COPY Cargo.toml Cargo.lock diesel.toml ./
COPY .cargo/config.toml .cargo/config.toml
RUN cargo fetch

COPY backend/ backend/

ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "Running on $BUILDPLATFORM building for $TARGETPLATFORM"
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        export TARGET_CHAIN=aarch64-unknown-linux-gnu; \
    elif [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
        export TARGET_CHAIN=x86_64-unknown-linux-gnu; \ 
    else \
        echo "Unsupported architecture: $TARGETPLATFORM" && exit 1; \
    fi && \
    cargo build --release --target $TARGET_CHAIN && \
    mv target/$TARGET_CHAIN/release/meshvault .



FROM --platform=$BUILDPLATFORM rust:1.82-bookworm AS rust-bindings-builder

COPY Cargo.toml .
RUN cargo install typeshare-cli
WORKDIR /code
COPY backend/ backend/
RUN typeshare ./backend --lang=typescript --output-file=bindings.ts



FROM --platform=$BUILDPLATFORM node:22-bookworm AS node-builder
WORKDIR /code
COPY package.json package-lock.json ./
RUN npm install

COPY index.html postcss.config.js tailwind.config.js tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts ./
COPY frontend/ frontend/ 

COPY --from=rust-bindings-builder /code/bindings.ts /code/frontend/bindings.ts
RUN npm run build



FROM debian:bookworm

ENV DATABASE_URL /meshvault/data/db.sqlite3
ENV LIBRARIES_PATH /meshvault/3dassets
ENV HOST "0.0.0.0:3000"

WORKDIR /meshvault
RUN mkdir data

COPY --from=node-builder /code/dist /meshvault/dist
COPY --from=rust-builder /code/meshvault /meshvault/meshvault

RUN chown -R 1000:1000 /meshvault
USER 1000
EXPOSE 3000
ENTRYPOINT [ "./meshvault" ]

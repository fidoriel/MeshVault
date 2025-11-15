FROM rust:1.91-bookworm

RUN apt-get update -y

# build dependencies
RUN apt-get install -y build-essential cmake pkg-config

# dependencies
RUN apt-get install -y libsqlite3-dev libfreetype6-dev libfontconfig1-dev libexpat1-dev libosmesa6-dev

WORKDIR /code

FROM daytonaio/sandbox:0.6.0

LABEL org.opencontainers.image.title="companyhelm/daytona" \
  org.opencontainers.image.description="CompanyHelm Daytona sandbox image with trusted CA certificates and core developer tooling." \
  org.opencontainers.image.version="latest"

ENV DEBIAN_FRONTEND=noninteractive

RUN if command -v sudo >/dev/null 2>&1; then SUDO=sudo; else SUDO=; fi \
  && $SUDO apt-get update \
  && $SUDO apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    gh \
    git \
    jq \
    less \
    openssh-client \
    openssl \
    procps \
    python3 \
    python3-pip \
    unzip \
    xz-utils \
    zip \
  && $SUDO update-ca-certificates \
  && $SUDO apt-get clean \
  && $SUDO rm -rf /var/lib/apt/lists/*

RUN if command -v sudo >/dev/null 2>&1; then SUDO=sudo; else SUDO=; fi \
  && $SUDO mkdir -p /workspace \
  && $SUDO chown -R "$(id -un)":"$(id -gn)" /workspace "$HOME"

WORKDIR /workspace

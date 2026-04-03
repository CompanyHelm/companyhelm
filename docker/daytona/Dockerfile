FROM daytonaio/sandbox:0.6.0

LABEL org.opencontainers.image.title="companyhelm/daytona" \
  org.opencontainers.image.description="CompanyHelm Daytona sandbox image with trusted CA certificates and core developer tooling." \
  org.opencontainers.image.version="latest"

USER root

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
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
  && update-ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace \
  && chown -R daytona:daytona /workspace /home/daytona

USER daytona
WORKDIR /workspace

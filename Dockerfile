FROM node:20-bullseye

# Install basic dev tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /workspace

# We'll install dependencies at runtime, not during build
CMD ["sleep", "infinity"]
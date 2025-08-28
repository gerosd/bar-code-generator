FROM node:20-bullseye

# Install basic dev tools in a single RUN command to reduce layers
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    gnupg \
    sudo \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Create node user home directory and set up proper permissions
RUN mkdir -p /home/node \
    && chown -R node:node /home/node

# Install bun globally for all users
RUN curl -fsSL https://bun.sh/install | bash \
    && ln -sf /root/.bun/bin/bun /usr/local/bin/bun

# Create workspace directory with proper ownership
RUN mkdir -p /workspace \
    && chown -R node:node /workspace

# Add node user to sudo group and configure passwordless sudo
RUN usermod -aG sudo node \
    && echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to node user
USER node
WORKDIR /workspace

# Set environment variables for node user
ENV PATH="/usr/local/bin:${PATH}"
ENV HOME="/home/node"

# We'll install dependencies at runtime, not during build
CMD ["sleep", "infinity"]
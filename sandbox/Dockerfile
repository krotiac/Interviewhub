FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    python3 \
    nodejs \
    npm \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /sandbox

# Create a non-root user for executing code safely
RUN useradd -m sandboxuser
USER sandboxuser

CMD ["bash"]

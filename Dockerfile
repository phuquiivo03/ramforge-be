FROM oven/bun:1



WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .


EXPOSE 3000

# Start the application directly with TypeScript
CMD ["bun", "run", "start"]
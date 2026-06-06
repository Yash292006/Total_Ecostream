FROM node:20-alpine

WORKDIR /app

# Copy package descriptors first to take advantage of Docker cache layer
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

# Expose Vite development port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]

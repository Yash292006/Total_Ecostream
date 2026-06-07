# Stage 1: Build Frontend
FROM node:18 AS build-frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Setup Backend
FROM node:18
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy the built frontend files into the backend public folder
COPY --from=build-frontend /app/frontend/dist ./backend/public

# Start the server
WORKDIR /app/backend
EXPOSE 10000
CMD ["node", "server.js"]

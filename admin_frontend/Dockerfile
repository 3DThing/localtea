FROM node:20-alpine

WORKDIR /app

# Install dependencies required for some packages
RUN apk add --no-cache libc6-compat

# Copy package.json and package-lock.json if they exist
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port (Next.js dev server default)
EXPOSE 3001

# Start the application
CMD ["npm", "run", "dev"]

# Use official Node.js image as base
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the source code
COPY . .

# Expose port the app listens on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]

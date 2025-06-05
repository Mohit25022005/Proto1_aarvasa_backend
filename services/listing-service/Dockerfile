FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY services/listing-service/package*.json ./services/listing-service/
RUN cd services/listing-service && npm install

# Copy the shared directory
COPY shared ./shared

# Copy the listing-service source code
COPY services/listing-service/src ./services/listing-service/src

# Set working directory to listing-service
WORKDIR /app/services/listing-service

EXPOSE 3002

CMD ["npm", "start"]
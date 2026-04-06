FROM node:20-alpine

# Install native dependencies for SQLite and node-gyp if necessary
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build TS files
RUN npm run build

CMD ["npm", "start"]

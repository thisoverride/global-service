FROM node:22
WORKDIR /usr/src/user-service
COPY package*.json ./
RUN yarn install
COPY . .
CMD ["yarn", "dev"]

FROM node:18-alpine

WORKDIR /frontend

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . .

RUN yarn next build

EXPOSE 3000

CMD yarn next start
FROM node:16.13.1-alpine as angular_build

WORKDIR /app

COPY package*.json /app/

COPY . /app/

RUN npm install
RUN npm install -g @angular/cli@12.1.3
RUN ng build --configuration production --source-map

FROM nginx:latest

COPY --from=angular_build /app/dist/flashcards /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

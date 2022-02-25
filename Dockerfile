FROM node:16.13.1-alpine as angular_build

WORKDIR /app

COPY package*.json /app/

COPY . /app/

RUN npm install && npm install -g @angular/cli@13 && ng build --configuration production --source-map && rm -r /app/node_modules

FROM nginx:latest

COPY --from=angular_build /app/dist/flashcards /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

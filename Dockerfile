FROM node:10
WORKDIR /app
COPY ./Server .
RUN npm install
EXPOSE 3000
CMD [ "node", "index.js" ]
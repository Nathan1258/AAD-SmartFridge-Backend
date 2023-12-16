FROM node:18-slim
WORKDIR /aad-backend
COPY package.json /aad-backend
RUN npm install
COPY . /aad-backend
CMD ["npm", "start"]
EXPOSE 5021
FROM "node:12-alpine"

RUN npm install -g lambda-alb
RUN mkdir /etc/lambda-alb

VOLUME /etc/lambda-alb

EXPOSE 8080

ENTRYPOINT lambda-alb -c /etc/lambda-alb/config.json

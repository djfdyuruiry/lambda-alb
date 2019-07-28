FROM "node:12.6.0-alpine"

ARG PACKAGE_VERSION

RUN npm install -g lambda-alb${PACKAGE_VERSION}
RUN mkdir /etc/lambda-alb

VOLUME /etc/lambda-alb

EXPOSE 8080

ENTRYPOINT lambda-alb -c /etc/lambda-alb/config.json

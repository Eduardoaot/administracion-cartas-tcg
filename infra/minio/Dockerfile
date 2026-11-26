# syntax=docker/dockerfile:1
# La edición comunitaria de MinIO quedó archivada (abr-2026) y ya no publica imágenes
# (minio/minio desapareció de Docker Hub y quay.io pide credenciales). Su README indica
# compilarla desde el código fuente, que es lo que hace esta imagen.
FROM golang:1.25-alpine AS build
ARG MINIO_VERSION=latest
ENV CGO_ENABLED=0 GOFLAGS=-trimpath
RUN go install github.com/minio/minio@${MINIO_VERSION}

FROM alpine:3.22
RUN apk add --no-cache ca-certificates wget \
  && adduser -D -u 10001 minio \
  && mkdir -p /data && chown minio /data
COPY --from=build /go/bin/minio /usr/bin/minio
USER minio
EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]

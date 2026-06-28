# Multi-stage build for the log-aggregator service.
# Build context is the logs/ dir (self-contained module, no workspace).
FROM golang:1.25-alpine AS build
WORKDIR /src

# Cache deps separately from source.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /out/logs .

# Minimal runtime image.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/logs /logs
EXPOSE 8091
USER nonroot:nonroot
ENTRYPOINT ["/logs"]

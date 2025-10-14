# Micro rizz

A proxy protocol meant to be implemented on cheaper, application specific, hosts

## How to use on server

You need a NodeJs server to run this proxy.

- Navigate to `node-server` directory and install dependencies with `pnpm i`
- Then start the server with `PORT` environment variable (default is 3000) using `pnpm start`.

## How to use on client

You need NodeJs on your client machine

### Quickstart example with WebSocket:

Navigate to `client` directory and expose a local proxy server like below:

```
pnpm start:dev -- run wss://remote_host:remote_port --protocol websocket
```

- Notice you need to change `wss` to `ws` if your remote server doesn't have SSL
- Your proxy should be available at `socks5://127.0.0.1:9091` 

### Quickstart example with WebRTC:
```
pnpm start:dev -- run https://remote_host:remote_port/webrtc --protocol webrtc
```
- Your proxy should be available at `socks5://127.0.0.1:9091`

### Command help
```
client run <server-uri>

Options:
  --help        Show help                                              [boolean]
  --protocol    Used to communicate with server
                            [string] [required] [choices: "websocket", "webrtc"]
  --socks-port  Local socks port to be exposed          [number] [default: 9091]
```

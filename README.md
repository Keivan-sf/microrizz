# Micro rizz

A proxy protocol meant to be implemented on cheaper, application specific, hosts

## How to use

### Server

You need a NodeJs server to run this proxy.

- Navigate to `node-server` directory and install dependencies with `pnpm i`
- Then start the server with `PORT` environment variable (default is 3000) using `pnpm start`.

### Client

You need NodeJs on your client machine

Navigate to `client` directory and expose a local proxy server like below:

```
pnpm start:dev -- run wss://your_remote_host:your_remote_port --username admin --password adminpw --socks-port 4080
```

- Notice you need to change `wss` to `ws` if your remote server doesn't have SSL
- Replace `your_remote_host` and `your_remote_port` with your actual server details
- Socks port is denoting the local socks5 port that would be exposed to your machine after this command
- Your proxy should be available at `socks5://127.0.0.1:4080`

### Todo

- Support more languages as server
- Fix server username password authentication
- Support custom server username password specification

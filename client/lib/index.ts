import { WebSocket } from "ws";
import { WSConnection } from "./utils/Connection";
import { sleep } from "./utils/sleep";
import { Server } from "./Server/index";
import { LocalSocksServer } from "./Socket";
import net from "net";
import { UdpSocketServer } from "./Socket/udpServer";
const SERVER = process.argv[2];
if (!SERVER) {
  console.log("Server address is needed");
  process.exit(1);
}

export async function start(opts: {
  server: string;
  username: string;
  password: string;
  localScocksPort: number;
}) {
  while (true) {
    const ws = new WebSocket(opts.server);
    try {
      let is_rejected = false;
      await new Promise(async (resolve, reject) => {
        try {
          await waitForConnctionEstablishment(ws);

          const wsConnection = new WSConnection(ws);
          const server = new Server(wsConnection, () => {
            if (!is_rejected) reject();
            is_rejected = true;
            closeConnections(wsConnection, socks_server);
          });
          server.start();
          server.authenticate(opts.username, opts.password);

          const socks_server = createLocalSocksServer(
            server,
            opts.localScocksPort,
          );
          callOnConnectionClosure(wsConnection, () => {
            if (!is_rejected) reject();
            is_rejected = true;
            closeConnections(wsConnection, socks_server);
          });
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      console.log(err);
      await sleep(2000);
    }
  }
}

function createLocalSocksServer(remoteServer: Server, port: number) {
  const socketServer = net.createServer();
  socketServer.listen(port);
  const udpServer = new UdpSocketServer(port);
  const socks_server = new LocalSocksServer(
    socketServer,
    remoteServer,
    udpServer,
  );
  console.log(`socks server exposed at socks5://127.0.0.1:${port}`);
  return socks_server;
}

async function waitForConnctionEstablishment(ws: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    let is_resolved = false;
    setTimeout(() => {
      if (!is_resolved) {
        reject("time out");
      }
    }, 10000);
    ws.once("open", () => {
      if (is_resolved) return;
      is_resolved = true;
      console.log("the connection has been established");
      resolve();
    });
    ws.once("error", (err: any) => {
      if (is_resolved) return;
      is_resolved = true;
      console.log("WS connection error", err);
      reject();
    });
  });
}

function callOnConnectionClosure(ws: WSConnection, cb: () => void): void {
  ws.on("close", () => {
    cb();
  });
  ws.on("error", () => {
    cb();
  });
}

function closeConnections(ws: WSConnection, socks_server: LocalSocksServer) {
  try {
    ws.close();
    socks_server.destroy();
  } catch (err) {}
}

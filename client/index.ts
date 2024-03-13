import { WebSocket } from "ws";
import { WSConnection } from "./utils/Connection";
import { sleep } from "./utils/sleep";
import { Server } from "./Server/index";
import { LocalSocksServer } from "./Socket";
import net from "net";
import { UdpSocketServer } from "./Socket/udpServer";
const SERVER = process.argv[2];
const LOCAL_PORT = 9091;
if (!SERVER) {
  console.log("Server address is needed");
  process.exit(1);
}

async function main() {
  while (true) {
    const ws = new WebSocket(SERVER);
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
          server.authenticate("admin", "adminpw");

          const socks_server = createLocalSocksServer(server, LOCAL_PORT);
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
      await sleep(2000);
    }
  }
}

function createLocalSocksServer(remoteServer: Server, port: number) {
  const socketServer = net.createServer();
  socketServer.listen(port);
  console.log("tcp server created");
  const udpServer = new UdpSocketServer(port);
  console.log("udp server created");
  const socks_server = new LocalSocksServer(
    socketServer,
    remoteServer,
    udpServer,
  );
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

main();

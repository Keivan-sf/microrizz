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

async function main() {
  while (true) {
    const ws = new WebSocket(SERVER);
    try {
      await new Promise<void>((resolve, reject) => {
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
      const wsConnection = new WSConnection(ws);
      const server = new Server(wsConnection);
      server.start();
      server.authenticate("admin", "adminpw");
      const socketServer = net.createServer();
      socketServer.listen(9091);
      console.log("tcp server created");
      const udpServer = new UdpSocketServer(9091);
      console.log("udp server created");
      const socks_server = new LocalSocksServer(
        socketServer,
        server,
        udpServer,
      );
      await waitTillDisconnection(wsConnection);
      socks_server.destroy();
      wsConnection.close();
    } catch (err) {
      await sleep(2000);
    }
  }
}

async function waitTillDisconnection(ws: WSConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    ws.on("close", () => {
      resolve();
    });
    ws.on("error", () => {
      resolve();
    });
  });
}

main();

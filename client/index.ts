import { WebSocket } from "ws";
import { WSConnection } from "./utils/Connection";
import { Server } from "./Server/index";
import { LocalSocksServer } from "./Socket";
import net from "net";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
  CONNECT: 1,
  DATA: 2,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
  TID_EXISTS: 2,
  NO_CONNECTION_ON_TASK: 3,
  TID_NOT_FOUND: 4,
};

async function main() {
  const ws = new WebSocket("ws://localhost:9092");
  await new Promise<void>((resolve, reject) => {
    let is_resolved = false;
    setTimeout(() => {
      if (!is_resolved) {
        reject("time out");
      }
    }, 10000);
    ws.once("open", () => {
      console.log("the connection has been established");
      resolve();
    });
  });
  const wsConnection = new WSConnection(ws);
  const server = new Server(wsConnection);
  server.start();
  server.authenticate("admin", "adminpw");
  const socketServer = net.createServer();
  socketServer.listen(9091);
  const socks_server = new LocalSocksServer(socketServer, server);
}

main();

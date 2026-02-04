import { WebSocket } from "ws";
import { WSConnection } from "./utils/WS";
import { sleep } from "./utils/sleep";
import { Server } from "./Server/index";
import { LocalSocksServer } from "./Socket";
import net from "net";
import { UdpSocketServer } from "./Socket/udpServer";
import { WRTCClient } from "./utils/WRTC";
import { Connection } from "./utils/interfaces";
import axios from "axios";
import { joinURLPaths } from "./utils/url";
import { HTTPConnection } from "./utils/HTTP";
const SERVER = process.argv[2];
if (!SERVER) {
  console.log("Server address is needed");
  process.exit(1);
}

export async function start(opts: {
  server: string;
  username: string;
  password: string;
  protocol: "websocket" | "webrtc" | "http";
  localScocksPort: number;
}) {
  while (true) {
    try {
      let is_rejected = false;
      await new Promise(async (resolve, reject) => {
        try {
          const connection: Connection = await getConnection(
            opts.protocol,
            opts.server,
          );
          const server = new Server(connection, () => {
            if (!is_rejected) reject();
            is_rejected = true;
            closeConnections(connection, socks_server);
          });
          server.start();
          server.authenticate(opts.username, opts.password);

          const socks_server = createLocalSocksServer(
            server,
            opts.localScocksPort,
          );
          callOnConnectionClosure(connection, () => {
            if (!is_rejected) reject();
            is_rejected = true;
            closeConnections(connection, socks_server);
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

function callOnConnectionClosure(connection: Connection, cb: () => void): void {
  connection.on("close", () => {
    cb();
  });
  connection.on("error", () => {
    cb();
  });
}

function closeConnections(
  connection: Connection,
  socks_server: LocalSocksServer,
) {
  try {
    connection.close();
    socks_server.destroy();
  } catch (err) {}
}

async function getConnection(
  protocol: "websocket" | "webrtc" | "http",
  uri: string,
): Promise<Connection> {
  if (protocol == "websocket") {
    const ws = new WebSocket(uri);
    await waitForConnctionEstablishment(ws);
    const wsConnection = new WSConnection(ws);
    return wsConnection;
  } else if (protocol == "webrtc") {
    const wrtc_client = new WRTCClient(uri);
    await wrtc_client.connect();
    return wrtc_client;
  } else {
    // const endpoint_req = await axios.post(joinURLPaths(uri, "http/initiate"));
    // const end_point = endpoint_req.data.end_point;
    const end_point = "data";
    const httpConnection = new HTTPConnection(
      joinURLPaths(uri, `http/${end_point}`),
    );
    return httpConnection;
  }
}

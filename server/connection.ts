import { WebSocketServer, WebSocket } from "ws";
interface Connection {
  write(data: Buffer): void;
  close(): void;
  on(type: "data", cb: (data: Buffer) => void): void;
  on(type: "close", cb: () => void): void;
  on(type: "error", cb: (error: any) => void): void;
  on(type: "connection", cb: () => void): void;
}

class WSConnection {
  constructor(private wss: WebSocket) { }
  public on(type: "data", cb: (data: Buffer) => void): void;
  public on(type: "close", cb: () => void): void;
  public on(type: "error", cb: (error: any) => void): void;
  public on(type: "connection", cb: () => void): void;
  public on(type: any, cb: any) {
    if (type == "data") {
      this.wss.on("message", cb);
    } else {
      this.wss.on(type, cb);
    }
  }
  public write(data: Buffer) {
    this.wss.send(data);
  }
}

import { WebSocket } from "ws";
import { Connection } from "./interfaces";

export class WSConnection implements Connection {
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
  public close() {
    this.wss.close();
  }
}

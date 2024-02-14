import { Connection } from "./interfaces";
import { WebSocket } from "ws";

export class WSConnection implements Connection {
  constructor(private ws: WebSocket) {}
  public on(type: "data", cb: (data: Buffer) => void): void;
  public on(type: "close", cb: () => void): void;
  public on(type: "error", cb: (error: any) => void): void;
  public on(type: "connection", cb: () => void): void;
  public on(type: any, cb: any) {
    if (type == "data") {
      this.ws.on("message", cb);
    } else {
      this.ws.on(type, cb);
    }
  }
  public write(data: Buffer) {
    this.ws.send(data);
  }
  public close() {
    this.ws.close();
  }
}

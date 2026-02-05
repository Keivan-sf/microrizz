import { Request, Response, Router } from "express";
import { Connection } from "../interfaces";
import { EventEmitter } from "stream";

export class HTTPConnection implements Connection {
  private emitter: EventEmitter = new EventEmitter();
  private req?: Request;
  private res?: Response;
  constructor(router: Router, end_point: string) {
    router.post(`/${end_point}`, (req, res) => {
      this.req = req;
      this.res = res;
      this.req.on("data", (data: Buffer) => {
        this.emitter.emit("data", data);
        console.log("received from client:", data);
      });
    });
  }
  write(data: Buffer): void {
    this.res?.write(data);
  }
  on(type: string, cb: any): void {
    this.emitter.on(type, cb);
  }
  close(): void {}
}

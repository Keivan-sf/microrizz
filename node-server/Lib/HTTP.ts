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
      this.req.on("data", (data: Buffer) => {
        this.emitter.emit("data", data);
        console.log("received from client:", data);
      });
    });

    router.get(`/${end_point}`, (req, res) => {
      console.log("get request received");
      this.res = res;
    });
  }
  write(data: Buffer): void {
    this.res?.write(data);
    console.log("wrote")
  }
  on(type: string, cb: any): void {
    this.emitter.on(type, cb);
  }
  close(): void {}
}

import { Request, Response, Router } from "express";
import { EventEmitter } from "events";

export interface Connection {
  write(data: Buffer): void;
  close(): void;

  on(type: "data", cb: (data: Buffer) => void): void;
  on(type: "close", cb: () => void): void;
  on(type: "error", cb: (error: any) => void): void;
  on(type: "connection", cb: () => void): void;
}

export class HTTPConnection implements Connection {
  private emitter = new EventEmitter();

  private req?: Request;
  private res?: Response;

  private writeBuffer: Buffer[] = [];

  private active = false;
  private destroyed = false;

  private readonly path: string;

  private readonly requestTimeoutMs = 15000;
  private readonly idleTimeoutMs = 5000;

  private requestTimer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;

  constructor(router: Router, path: string) {
    this.path = path;

    router.post(`/${path}`, (req, res) => {
      if (this.destroyed) {
        res.status(410).end();
        return;
      }

      this.attachHttp(req, res);
    });

    this.startIdleTimer();
  }

  write(data: Buffer) {
    if (this.destroyed) return;

    if (!this.active || !this.res) {
      this.writeBuffer.push(data);
      return;
    }

    this.res.write(data);
  }

  close() {
    if (this.destroyed) return;
    this.destroy();
  }

  on(type: any, cb: any) {
    this.emitter.on(type, cb);
  }

  private attachHttp(req: Request, res: Response) {
    if (this.destroyed) return;

    this.stopIdleTimer();

    this.internalClose();

    this.req = req;
    this.res = res;
    this.active = true;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Content-Type-Options", "nosniff");

    this.emitter.emit("connection");

    for (const buf of this.writeBuffer) {
      res.write(buf);
    }
    this.writeBuffer = [];

    req.on("data", (chunk: Buffer) => {
      this.emitter.emit("data", chunk);
    });

    req.on("end", () => {
      this.internalClose();
    });

    req.on("error", (err) => {
      this.emitter.emit("error", err);
      this.internalClose();
    });

    res.on("close", () => {
      this.internalClose();
    });

    this.requestTimer = setTimeout(() => {
      this.internalClose();
    }, this.requestTimeoutMs);
  }

  private internalClose() {
    if (!this.active) return;

    this.active = false;

    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = undefined;
    }

    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }

    this.req?.removeAllListeners();
    this.res?.removeAllListeners();

    this.req = undefined;
    this.res = undefined;

    this.startIdleTimer();
  }

  private startIdleTimer() {
    if (this.destroyed) return;
    if (this.idleTimer) return;

    this.idleTimer = setTimeout(() => {
      this.idleTimer = undefined;

      this.emitter.emit("close");

      this.destroy();
    }, this.idleTimeoutMs);
  }

  private stopIdleTimer() {
    if (!this.idleTimer) return;

    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.stopIdleTimer();

    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = undefined;
    }

    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }

    this.req?.removeAllListeners();
    this.res?.removeAllListeners();

    this.req = undefined;
    this.res = undefined;

    this.writeBuffer = [];

    this.emitter.removeAllListeners();
  }
}

import { Duplex } from "stream";

export interface Connection {
  write(data: Buffer): void;
  close(): void;
  on(type: "data", cb: (data: Buffer) => void): void;
  on(type: "close", cb: () => void): void;
  on(type: "error", cb: (error: any) => void): void;
  on(type: "connection", cb: () => void): void;
}

export interface Task {
  incoming: Duplex;
  outgoing: Duplex;
  tid: number;
  dest?: Buffer;
}

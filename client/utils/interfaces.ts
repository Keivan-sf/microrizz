export interface Connection {
  write(data: Buffer): void;
  close(): void;
  on(type: "data", cb: (data: Buffer) => void): void;
  on(type: "close", cb: () => void): void;
  on(type: "error", cb: (error: any) => void): void;
  on(type: "connection", cb: () => void): void;
}

export interface Task {
  tid: number;
  dest?: Buffer;
  inuse: boolean;
  ondata?: (data: Buffer) => void;
  onUdpData?: (data: Buffer) => void;
  onclose?: () => void;
}

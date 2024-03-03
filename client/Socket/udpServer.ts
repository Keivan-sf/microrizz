import dgram from "dgram";

class UdpSocksServer {
  private socket: dgram.Socket;
  constructor(port: number) {
    this.socket = dgram.createSocket("udp4");
    this.socket.bind(port);
  }
  addTask(tid: number, address: string, port: number) {}
  closeTask(tid: number) {}
  setListenerForTask(
    tid: number,
    type: "data" | "close",
    cb: (data?: Buffer) => {},
  ) {}
}

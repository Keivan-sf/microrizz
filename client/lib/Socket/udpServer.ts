import dgram from "dgram";

interface UdpTask {
  address: string;
  port: number;
  ondata?: (data: Buffer) => void;
  onclose?: () => void;
}
export class UdpSocketServer {
  private socket: dgram.Socket;
  /**
   * Key format: `[address]:[port]`
   *
   * > **address** and **port** are the ones passed when initializing a task
   *
   * E.g.: `127.0.0.1:54321`
   */
  private address_to_task: Map<string, UdpTask> = new Map();
  constructor(port: number) {
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.socket.bind(port);
    this.socket.on("message", (data, info) => {
      const key = `${info.address}:${info.port}`;
      const task = this.address_to_task.get(key);
      if (!task || !task.ondata) return;
      task.ondata(data);
    });
  }
  addTask(
    address: string,
    port: number,
    ondata: (data: Buffer) => void,
    onclose: () => void,
  ) {
    const task: UdpTask = {
      port,
      address,
      ondata: ondata,
      onclose: onclose,
    };
    this.address_to_task.set(`${address}:${port}`, task);
  }
  sendDataToTask(msg: Buffer, address: string, port: number) {
    if (!this.address_to_task.has(`${address}:${port}`)) {
      throw new Error("task does not exist in udp list");
    }
    this.socket.send(msg, port, address);
  }
  close(address: string, port: number) {
    this.address_to_task.delete(`${address}:${port}`);
  }
}

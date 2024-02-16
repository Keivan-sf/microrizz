import net from "net";
import { Server } from "../Server";
import TaskManager from "../utils/TaskManager";
import { Task } from "../utils/interfaces";

const METHODS: { [key in number]: string } = {
  1: "connect",
  2: "bind",
  3: "udp",
};

export class LocalSocksServer {
  constructor(
    private localServer: net.Server,
    private remoteServer: Server,
  ) {
    localServer.on("connection", (socket) => this.onConnection(socket));
    localServer.on("error", () => this.onError());
    localServer.on("close", () => this.onClose());
  }
  private onClose() {}
  private onError() {}
  private onConnection(socket: net.Socket) {
    new SocksClientConenction(socket, this.remoteServer);
  }
}

class SocksClientConenction {
  public state: "auth" | "ready" | "connected" = "auth";
  public tid: number | undefined = undefined;
  constructor(
    private socket: net.Socket,
    private remoteServer: Server,
  ) {
    this.socket.on("data", (data) => this.onData(data));
    this.socket.on("error", () => this.onError());
    this.socket.on("close", () => this.onClose());
  }

  private async onData(data: Buffer) {
    console.log("client on data", data);
    if (this.state == "auth") {
      if (data.at(0) != 5) {
        return this.close("version was not five");
      }
      if (data.readUInt8(1) < 1) {
        return this.close("no methods were provided by the client");
      }
      this.socket.write(Buffer.from([0x05, 0x00]));
      this.state = "ready";
    } else if (this.state == "ready") {
      if (data.at(0) != 5) {
        return this.close("version was not five");
      }
      if (data.at(1) != 1) {
        return this.close(
          "method was not connect: " +
            data.at(1) +
            " meaning: " +
            METHODS[data.at(1) as number],
        );
      }
      console.log("we have a connection request!");
      this.tid = await this.remoteServer.initiateTask();
      console.log("we have a task for it!", this.tid);
      const connectBindAddr = await this.remoteServer.connectTaskToDest(
        this.tid,
        data.subarray(3),
      );
      this.remoteServer.setListenerToTask(this.tid, "data", (data: Buffer) => {
        this.socket.write(data);
      });
      this.socket.write(
        Buffer.concat([Buffer.from([0x05, 0x00, 0x00]), connectBindAddr]),
      );
      // this.task.on("close", () => {
      //   if (!this.socket.closed) this.socket.end();
      // });
      this.state = "connected";
      console.log("we are connected to the destination!");
    } else if (this.state == "connected") {
      if (!this.tid) {
        console.log("no task but data coming anyway");
        return;
      }
      this.remoteServer.writeToTask(this.tid, data);
    }
  }
  private onError() {
    if (this.tid) this.remoteServer.closeTask(this.tid);
    console.log("socket on error ???");
  }
  private onClose() {
    if (this.tid) this.remoteServer.closeTask(this.tid);
    console.log("socket closed???");
  }
  private close(msg?: string) {
    if (msg) console.log(msg);
  }
}

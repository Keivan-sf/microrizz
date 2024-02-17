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
    localServer.on("error", (err) => this.onError(err));
    localServer.on("close", () => this.onClose());
  }
  private onClose() {
    throw new Error("local socket closed");
  }
  private onError(err: any) {
    throw new Error("local socket disconnected with an error" + err);
  }
  private onConnection(socket: net.Socket) {
    new SocksClientConenction(socket, this.remoteServer);
  }
}

class SocksClientConenction {
  public state: "auth" | "ready" | "connected" = "auth";
  public is_closed = false;
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
    try {
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
        this.tid = await this.remoteServer.initiateTask();
        if (this.is_closed) {
          this.remoteServer.closeTask(this.tid);
          return;
        }
        console.log(
          "A new task has been created for a connection request",
          this.tid,
        );
        console.log("Requesting connection for task", this.tid);
        const connectBindAddr = await this.remoteServer.connectTaskToDest(
          this.tid,
          data.subarray(3),
        );
        console.log("task", this.tid, "was connected to dest");
        console.log("setting on data listener for task", this.tid);
        this.remoteServer.setListenerToTask(
          this.tid,
          "data",
          (data: Buffer) => {
            this.socket.write(data);
          },
        );

        this.socket.write(
          Buffer.concat([Buffer.from([0x05, 0x00, 0x00]), connectBindAddr]),
        );
        // this.task.on("close", () => {
        //   if (!this.socket.closed) this.socket.end();
        // });
        this.state = "connected";
      } else if (this.state == "connected") {
        if (!this.tid) {
          console.log("no task but data coming anyway", this.tid);
          return;
        }
        this.remoteServer.writeToTask(this.tid, data);
      }
    } catch (err) {
      console.log("handled error on data", err);
      console.log("closing", this.tid);
      this.close();
    }
  }
  private onError() {
    this.close();
    console.log("socket on error ???");
  }
  private onClose() {
    this.close();
  }
  private close(msg?: string) {
    console.log("socket closed???", this.tid);
    this.is_closed = true;
    if (this.tid) this.remoteServer.closeTask(this.tid);
    if (!this.socket.closed) this.socket.end();
    if (msg) console.log(msg);
  }
}

import net from "net";
import { Server } from "../Server";
import dgram from "dgram";
import * as parsers from "../utils/address_parsers";
import { UdpSocketServer } from "./udpServer";

const METHODS: { [key in number]: string } = {
  1: "connect",
  2: "bind",
  3: "udp",
};

export class LocalSocksServer {
  constructor(
    private localServer: net.Server,
    private remoteServer: Server,
    private udpServer: UdpSocketServer,
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
    new SocksClientConenction(socket, this.remoteServer, this.udpServer);
  }
  public destroy() {
    try {
      this.localServer.removeAllListeners();
    } catch (err) { }
    try {
      this.localServer.close();
    } catch (err) { }
  }
}

class SocksClientConenction {
  public state: "auth" | "ready" | "connected" = "auth";
  public is_closed = false;
  public tid: number | undefined = undefined;
  constructor(
    private socket: net.Socket,
    private remoteServer: Server,
    private udpServer: UdpSocketServer,
  ) {
    // this.socket.setTimeout(5000);
    this.socket.on("data", (data) => this.onData(data));
    this.socket.on("error", () => this.onError());
    this.socket.on("close", () => this.onClose());
    this.socket.on("timeout", () => this.onTimeout());
  }

  private async onData(data: Buffer) {
    try {
      if (this.state == "auth") {
        if (data.at(0) != 5) {
          console.log("version was not five");
          return this.close();
        }
        if (data.readUInt8(1) < 1) {
          console.log("no methods were provided by the client");
          return this.close();
        }
        this.socket.write(Buffer.from([0x05, 0x00]));
        this.state = "ready";
      } else if (this.state == "ready") {
        if (data.at(0) != 5) {
          console.log("version was not five");
          return this.close();
        }
        if (data.at(1) == 1) {
          this.tid = await this.remoteServer.initiateTask();
          if (this.is_closed) {
            this.remoteServer.closeTask(this.tid);
            return;
          }
          const connectBindAddr = await this.remoteServer.connectTaskToDest(
            this.tid,
            data.subarray(3),
          );
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
        } else if (data.at(1) == 3) {
          // udp
          this.tid = await this.remoteServer.initiateTask();
          if (this.is_closed) {
            this.remoteServer.closeTask(this.tid);
            return;
          }
          // CONTINUE HERE
        } else {
          console.log(
            "method was not supported: " +
            data.at(1) +
            " meaning: " +
            METHODS[data.at(1) as number],
          );
          return this.close();
        }
      } else if (this.state == "connected") {
        if (!this.tid) {
          return;
        }
        this.remoteServer.writeToTask(this.tid, data);
      }
    } catch (err) {
      console.log("handled error on data", err);
      this.close();
    }
  }
  private onError() {
    this.close();
  }
  private onClose() {
    this.close();
  }
  private onTimeout() {
    this.close();
  }
  private close() {
    this.is_closed = true;
    if (this.tid) this.remoteServer.closeTask(this.tid);
    if (!this.socket.destroyed) this.socket.destroy();
  }
}

import { Connection } from "../interfaces";
import net from "net";
import * as utils from "./utils";
import dgram from "dgram";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
  // less than 128 commands are task specific
  CONNECT: 1,
  DATA: 2,
  UDP_ASSOCIATE: 3,
  UDP_DATA: 4,
  SERVER_CLOSE_TASK: 126,
  CLIENT_CLOSE_TASK: 127,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
  TID_EXISTS: 2,
  NO_CONNECTION_ON_TASK: 3,
  TID_NOT_FOUND: 4,
};

interface Task {
  state: "connected" | "opened" | "closed";
  id: number;
  last_activity: number;
  interval?: NodeJS.Timeout;
  connection?: net.Socket;
  udpSocket?: dgram.Socket;
}

export class Client {
  public tasks: Map<number, Task> = new Map();
  constructor(
    public connection: Connection,
    private timeout: number,
  ) {
    setInterval(() => {
      console.log("number of stored tasks", this.tasks.size);
    }, 10000);
    connection.on("data", (data: Buffer) => {
      if (!data || data.length < 1) return;
      if ((data.at(0) as number) < 128) {
        try {
          this.handleTaskSpecificCommand(data);
        } catch (err) {
          console.log("error handling task specific command", data.at(0), err);
        }
        return;
      } else {
        try {
          this.handleClientSpecificCommand(data);
        } catch (err) {
          console.log(
            "error handling client specific command",
            data.at(0),
            err,
          );
        }
      }
    });
  }

  private handleTaskSpecificCommand(data: Buffer) {
    const TID = data.readUIntBE(1, 2);
    const task = this.tasks.get(TID);
    if (!task) {
      this.connection.write(
        Buffer.concat([
          Buffer.from([0x00, data.at(0) ?? 0x00]),
          data.subarray(1, 3),
          Buffer.from([ERRORS.TID_NOT_FOUND]),
        ]),
      );
      return;
    }
    task.last_activity = Date.now();
    if (data.at(0) == COMMANDS.CONNECT) {
      this.handleConnectCmd(task, data);
    } else if (data.at(0) == COMMANDS.DATA) {
      this.handleDataCmd(task, data);
    } else if (data.at(0) == COMMANDS.UDP_ASSOCIATE) {
      this.handleUdpAssociateCmd(task, data);
    } else if (data.at(0) == COMMANDS.UDP_DATA) {
      this.handleUdpDataCmd(task, data);
    } else if (data.at(0) == COMMANDS.CLIENT_CLOSE_TASK) {
      this.handleCloseTaskCmd(task);
    }
  }

  private handleClientSpecificCommand(data: Buffer) {
    if (data.at(0) == COMMANDS.AUTH) {
      this.authenticate(data);
    } else if (data.at(0) == COMMANDS.NEW_TASK) {
      this.createTask(data);
    }
  }

  private handleDataCmd(task: Task, data: Buffer) {
    if (!task.connection) {
      const b = Buffer.allocUnsafe(5);
      b.writeUInt8(0x00);
      b.writeUInt8(COMMANDS.CONNECT, 1);
      b.writeUintBE(task.id, 2, 2);
      b.writeUInt8(ERRORS.NO_CONNECTION_ON_TASK, 4);
      this.connection.write(b);
      return;
    }
    task.connection.write(data.subarray(3));
  }

  private handleUdpAssociateCmd(task: Task, data: Buffer) {
    task.udpSocket = dgram.createSocket("udp4");
    const b = Buffer.allocUnsafe(3);
    b.writeUInt8(COMMANDS.UDP_ASSOCIATE);
    b.writeUintBE(task.id, 1, 2);
    this.connection.write(b);
  }

  private handleUdpDataCmd(task: Task, data: Buffer) {
    if (!task.udpSocket) return; // send error message here
    const { host, port, offset } = utils.parse_addr(data, 4);
    const message = data.subarray(offset);
    task.udpSocket.send(message, port, host);
  }

  private handleCloseTaskCmd(task: Task) {
    this.closeTask(task, false);
    const b = Buffer.allocUnsafe(3);
    b.writeUint8(COMMANDS.CLIENT_CLOSE_TASK);
    b.writeUIntBE(task.id, 1, 2);
    this.connection.write(b);
  }

  private closeTask(task: Task, sendCloseCommandToClient = true) {
    console.log("closed", task.id);
    if (task.interval) {
      clearInterval(task.interval);
    }
    if (task.connection) {
      if (!task.connection.destroyed) task.connection.destroy();
    }
    this.tasks.delete(task.id);
    if (sendCloseCommandToClient) {
      const b = Buffer.allocUnsafe(3);
      b.writeUint8(COMMANDS.SERVER_CLOSE_TASK);
      b.writeUIntBE(task.id, 1, 2);
      this.connection.write(b);
    }
  }

  private handleConnectCmd(task: Task, data: Buffer) {
    const { port, host } = utils.parse_addr(data, 3);
    task.connection = net.createConnection({ host, port });
    task.connection.on("error", () => {
      this.closeTask(task);
    });
    task.connection.on("close", () => {
      this.closeTask(task);
    });
    task.connection.once("connect", () => {
      task.last_activity = Date.now();
      task.state = "connected";
      const b = Buffer.allocUnsafe(4);
      b.writeUInt8(COMMANDS.CONNECT);
      b.writeUintBE(task.id, 1, 2);
      b.writeUint8(1, 3);
      const ip_buffer = utils.ip_to_buffer(
        task.connection?.localAddress as string,
        task.connection?.localPort as number,
      );
      this.connection.write(Buffer.concat([b, ip_buffer]));
    });
    task.connection.on("data", (data) => {
      task.last_activity = Date.now();
      const b = Buffer.allocUnsafe(3);
      b.writeUInt8(COMMANDS.DATA);
      b.writeUintBE(task.id, 1, 2);
      this.connection.write(Buffer.concat([b, data]));
    });
  }

  private createTask(data: Buffer) {
    const TID = data.readUIntBE(1, 2);
    if (this.tasks.has(TID)) {
      this.connection.write(
        Buffer.from([0x00, COMMANDS.NEW_TASK, ERRORS.TID_EXISTS]),
      );
      return;
    }
    const task: Task = { id: TID, state: "opened", last_activity: Date.now() };
    const interval = setInterval(() => {
      if (Date.now() - task.last_activity > this.timeout) {
        console.log("closing due to timeout", TID);
        this.closeTask(task, true);
      }
    }, this.timeout);
    task.interval = interval;
    this.tasks.set(TID, task);
    const res = Buffer.allocUnsafe(3);
    res.writeUInt8(COMMANDS.NEW_TASK);
    res.writeUIntBE(TID, 1, 2);
    this.connection.write(res);
  }

  private authenticate(data: Buffer) {
    const IDLEN = data.at(1) as number;
    const ID = data.subarray(2, IDLEN + 2);
    const PWLEN = data.at(IDLEN + 2) as number;
    const PW = data.subarray(IDLEN + 3, PWLEN + IDLEN + 3);
    if (ID.toString() == "admin" && PW.toString() == "adminpw") {
      this.connection.write(Buffer.from([128]));
    } else {
      this.connection.write(
        Buffer.from([0x00, COMMANDS.AUTH, ERRORS.BAD_UNAME_PW]),
      );
    }
  }
}

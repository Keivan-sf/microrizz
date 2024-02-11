import { Connection } from "../interfaces";
import net from "net";
import * as utils from "./utils";
import { error } from "console";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
  CONNECT: 1,
  DATA: 2,
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
  connection?: net.Socket;
}

export class Client {
  public tasks: Map<number, Task> = new Map();
  constructor(public connection: Connection) {
    connection.on("data", (data: Buffer) => {
      if (!data || data.length < 1) return;
      if ((data.at(0) as number) < 128) {
        try {
          this.handleTaskSpecificCommand(data);
        } catch (err) {
          console.log("task error", err);
        }
        return;
      } else {
        try {
          this.handleClientSpecificCommand(data);
        } catch (err) {
          console.log("error", err);
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
    if (data.at(0) == COMMANDS.CONNECT) {
      this.handleConnectCmd(task, data);
    } else if (data.at(0) == COMMANDS.DATA) {
      this.handleDataCmd(task, data);
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

  private handleConnectCmd(task: Task, data: Buffer) {
    const { port, host } = utils.parse_addr(data, 3);
    task.connection = net.createConnection({ host, port });
    task.connection.on("error", () => {
      // close task with error
    });
    task.connection.once("connect", () => {
      task.state = "connected";
      console.log("connected to the requested host");
      const b = Buffer.allocUnsafe(3);
      b.writeUInt8(COMMANDS.CONNECT);
      b.writeUintBE(task.id, 1, 2);
      this.connection.write(b);
    });
    task.connection.on("data", (data) => {
      const b = Buffer.allocUnsafe(3);
      b.writeUInt8(COMMANDS.DATA);
      b.writeUintBE(task.id, 1, 2);
      this.connection.write(Buffer.concat([b, data]));
    });
    console.log(host, port);
  }

  private createTask(data: Buffer) {
    const TID = data.readUIntBE(1, 2);
    if (this.tasks.has(TID)) {
      this.connection.write(
        Buffer.from([0x00, COMMANDS.NEW_TASK, ERRORS.TID_EXISTS]),
      );
      return;
    }
    const task: Task = { id: TID, state: "opened" };
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

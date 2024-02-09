import { Connection } from "../interfaces";

const COMMANDS = {
  AUTH: 128,
  NEW_TASK: 129,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
  TID_EXISTS: 2,
};

export class Client {
  public tasks: Map<number, Task> = new Map();
  constructor(public connection: Connection) {
    connection.on("data", (data: Buffer) => {
      if (!data || data.length < 1) return;
      if ((data.at(0) as number) < 128) {
        return;
      } else {
        try {
          this.handleClientSpeceficCommand(data);
        } catch (err) {
          console.log("error", err);
        }
      }
    });
  }

  public send(data: Buffer, pid?: number) {}
  public close(data: Buffer, pid?: number) {}

  private handleClientSpeceficCommand(data: Buffer) {
    if (data.at(0) == COMMANDS.AUTH) {
      this.authenticate(data);
    } else if (data.at(0) == COMMANDS.NEW_TASK) {
      this.createTask(data);
    }
  }

  private createTask(data: Buffer) {
    const TID = data.readUIntBE(1, 2);
    if (this.tasks.has(TID)) {
      this.connection.write(
        Buffer.from([0x00, COMMANDS.NEW_TASK, ERRORS.TID_EXISTS]),
      );
      return;
    }
    const task = new Task(this);
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

class Task {
  constructor(client: Client) {}
}

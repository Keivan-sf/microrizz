import { Connection } from "../interfaces";

const COMMANDS = {
  AUTH: 128,
};

const ERRORS = {
  BAD_UNAME_PW: 1,
};

export class Client {
  public processes: Map<number, Process> = new Map();
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
    }
  }

  private authenticate(data: Buffer) {
    const IDLEN = data.at(1) as number;
    const ID = data.subarray(2, IDLEN + 2);
    const PWLEN = data.at(IDLEN + 2) as number;
    const PW = data.subarray(IDLEN + 3, PWLEN + IDLEN + 3);
    console.log(ID, PW);
    if (ID.toString() == "admin" && PW.toString() == "adminpw") {
      this.connection.write(Buffer.from([128]));
    } else {
      this.connection.write(
        Buffer.from([0x00, COMMANDS.AUTH, ERRORS.BAD_UNAME_PW]),
      );
    }
  }
}

class Process {
  constructor(client: Client) {}
}

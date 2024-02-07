import { Connection } from "../interfaces";

export class Client {
  public processes: Map<number, Process> = new Map();
  constructor(public connection: Connection) {
    connection.on("data", (data: Buffer) => {
      if (!data || data.length < 1) return;
      if ((data.at(0) as number) < 128) {
        return;
      } else {
        try {
          this.handleClientSpeceficRequest(data);
        } catch (err) {
          console.log("error", err);
        }
      }
    });
  }

  public send(data: Buffer, pid?: number) {}
  public close(data: Buffer, pid?: number) {}

  private handleClientSpeceficRequest(data: Buffer) {
    if (data.at(0) == 128) {
      this.authenticate(data);
    }
  }

  private authenticate(data: Buffer) {
    const IDLEN = data.at(1) as number;
    const ID = data.subarray(2, IDLEN + 2);
    const PWLEN = data.at(IDLEN + 2) as number;
    const PW = data.subarray(IDLEN + 3, PWLEN + IDLEN + 3);
    console.log(ID, PW);
    this.connection.write(Buffer.from([128]));
  }
}

class Process {
  constructor(client: Client) {}
}

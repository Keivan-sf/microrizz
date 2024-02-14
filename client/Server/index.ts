import { Connection } from "../utils/interfaces";

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

export class Server {
  private state: "none" | "auth" | "ready" = "none";
  constructor(public connection: Connection) {}
  public authenticate(uname: string, pw: string) {
    if (this.state != "none") {
      console.log("State is not on `none`");
      return;
    }
    const auth_message = Buffer.concat([
      Buffer.from([COMMANDS.AUTH]),
      Buffer.from([uname.length]),
      Buffer.from(uname),
      Buffer.from([pw.length]),
      Buffer.from(pw),
    ]);
    this.connection.write(auth_message);
    this.state = "auth";
  }
  public start() {
    this.connection.on("data", (data: Buffer) => {
      console.log("server message", data);
      if (data.at(0) == COMMANDS.AUTH && this.state == "auth") {
        this.state = "ready";
        console.log("auth message arrived here");
      }
    });
  }
}

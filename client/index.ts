import * as lib from "./lib";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
yargs(hideBin(process.argv))
  .scriptName("client")
  .command(
    "run <server-uri>",
    "Connects to the remote server",
    (y) => {
      y.version(false);
      y.option("username", {
        requiresArg: true,
        type: "string",
        description: "Used for authentication",
      });
      y.option("password", {
        requiresArg: true,
        type: "string",
        description: "Used for authentication",
      });
      y.option("socks-port", {
        requiresArg: false,
        type: "number",
        description: "Local socks port to be exposed",
        default: 9091,
      });
      y.check((args: any) => {
        if (
          isNaN(args["socks-port"]) ||
          args["socks-port"] < 0 ||
          args["socks-port"] > 65535
        ) {
          throw new Error("socks-port must be a number between 0 to 65535");
        }
        return true;
      });
    },
    (args: any) => {
      lib.start({
        server: args["server-uri"],
        localScocksPort: args["socks-port"],
        username: args["username"],
        password: args["password"],
      });
    },
  )
  .parse();

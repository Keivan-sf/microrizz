import net from "net";

const main = () => {
  const server = net.createServer();
  server.listen(9091);
  server.on("listening", () => {
    console.log("server listening on port 9091");
  });
  server.on("connection", connection_listener);
};

async function connection_listener(s: net.Socket) {
  let state: 0 | 1 | 2 | 3 = 0;
  let connection_to_server: net.Socket | undefined;
  s.on("close", () => {
    if (connection_to_server && !connection_to_server.closed)
      connection_to_server.end();
  });
  s.on("error", () => {
    console.log("error happened in cliend side");
    if (connection_to_server && !connection_to_server.closed)
      connection_to_server.end();
    if (!s.closed) s.end();
  });
  s.on("data", async (data: Buffer) => {
    try {
      console.log("whole data is:", data);
      if (state == 0) {
        if (data.at(0) != 5) {
          throw new Error("version must be five");
        }
        const method_count = data.readUInt8(1);
        const methods = data.subarray(2, 2 + method_count);
        state++;
        data.readUIntBE(0, 2);
        s.write(Buffer.from([0x05, 0x00]));
      } else if (state == 1) {
        if (data.at(0) != 5) {
          throw new Error("version must be five");
        }
        if (data.at(1) == 1) {
          if (data.at(3) == 1 || true) {
            // ip address
            const addr = parse_addr(data, 3);
            console.dir(addr);
            connection_to_server = net.createConnection({
              host: addr.host,
              port: addr.port,
            });
            await wait_for_connection(connection_to_server);
            const ip_buffer = ip_to_buffer(
              connection_to_server.localAddress as string,
              connection_to_server.localPort as number,
            );
            const prefix = Buffer.from([0x05, 0x00, 0x00, 0x01]);
            const response = Buffer.concat([prefix, ip_buffer]);
            s.write(response);
            connection_to_server.on("data", (d) => {
              s.write(d);
            });
            connection_to_server.on("close", () => {
              if (!s.closed) s.end();
            });
            connection_to_server.on("error", () => {
              console.log("Error happens in connection to server");
              if (connection_to_server && !connection_to_server.closed)
                connection_to_server.end();
              if (!s.closed) s.end();
            });
            state++;
          }
        } else {
          throw new Error("method was not connect");
        }
      } else if (state == 2) {
        if (!connection_to_server) {
          throw new Error("No connection established");
        }
        connection_to_server.write(data);
      } else if (state == 3) {
      }
    } catch (err) {
      console.log("err occurred", err);
      console.log("closing the connection");
      if (!s.closed) s.end();
    }
  });
}

const wait_for_connection = (connection: net.Socket): Promise<void> =>
  new Promise((resolve, reject) => {
    connection.on("connect", () => {
      resolve();
    });
    connection.on("error", (err) => reject(err));
  });

const parse_addr = (
  buffer: Buffer,
  offset: number = 0,
): { host: string; port: number } => {
  if (buffer.at(offset) == 1) {
    offset += 1;
    const ipv4: string[] = [];
    const address = buffer.subarray(offset, offset + 4);
    for (const byte of address) {
      ipv4.push(byte.toString());
    }
    const port = buffer.readUintBE(offset + 4, 2);

    return { host: ipv4.join("."), port };
  } else if (buffer.at(offset) == 3) {
    offset += 1;
    const domain_len = buffer.at(offset);
    offset += 1;
    if (!domain_len) throw new Error("No lenght found for domain");
    const address = buffer.subarray(offset, offset + domain_len);
    const port = buffer.readUintBE(offset + domain_len, 2);
    const domain = address.toString();
    return { host: domain, port };
  } else {
    offset += 1;
    let ipv6str = "";
    for (let b = 0; b < 16; ++b) {
      if (b % 2 === 0 && b > 0) ipv6str += ":";
      ipv6str +=
        ((buffer.at(offset + b) as number) < 16 ? "0" : "") +
        (buffer.at(offset + b) as number).toString(16);
    }
    const port = buffer.readUintBE(offset + 16, 2);
    console.log(offset + 16);
    return { host: ipv6str, port };
  }
};

const ip_to_buffer = (ipv4: string, port: number): Buffer => {
  const ip_buffer = Buffer.from(ipv4.split(".").map((chunk) => +chunk));
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([ip_buffer, port_buffer]);
};
main();
const bBuffer = Buffer.from([
  0x05, 0x01, 0x00, 0x03, 0x13, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73,
  0x2e, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2e, 0x63, 0x6f, 0x6d, 0x01, 0xbb,
]);
const bv6buffer = Buffer.from([
  0x05, 0x01, 0x00, 0x04, 0x10, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x08, 0x08, 0x00, 0x20, 0x0c, 0x41, 0x7a, 0x00, 0x50,
]);
// console.log(parse_addr(bv6buffer, 3));

import net from "net";
import dgram from "dgram";
const PORT = 9095;

const main = () => {
  const server = net.createServer();
  const udp_server = dgram.createSocket("udp4");

  server.listen(PORT);
  udp_server.bind(PORT);
  server.once("listening", () => {
    console.log(`server listening on port ${PORT}`);
  });
  udp_server.once("listening", () => {
    console.log(`udp is listening on port ${PORT}`);
  });
  server.on("connection", connection_listener);
  udp_listener(udp_server);
};

async function udp_listener(server: dgram.Socket) {
  //  +----+------+------+----------+----------+----------+
  //  |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
  //  +----+------+------+----------+----------+----------+
  //  | 2  |  1   |  1   | Variable |    2     | Variable |
  //  +----+------+------+----------+----------+----------+
  server.on("message", (data, info) => {
    const { host, port, offset, type } = parse_addr(data, 3);
    const msg = data.subarray(offset);
    const response = Buffer.from([0x00, 0x01]);
    const udp_socket = dgram.createSocket("udp4");
    udp_socket.send(msg, port, host);
    udp_socket.on("message", (remote_data) => {
      const prefix = Buffer.from([0x00, 0x00, 0x00]);
      const ip_buffer =
        type == "ipv4"
          ? Buffer.concat([Buffer.from([0x01]), ip_to_buffer(host, port)])
          : type == "ipv6"
            ? Buffer.concat([Buffer.from([0x04]), ipv6_to_buffer(host, port)])
            : Buffer.concat([
                Buffer.from([0x03]),
                domain_to_buffer(host, port),
              ]);
      const response = Buffer.concat([prefix, ip_buffer, msg]);
      server.send(response, info.port, info.address);
    });
  });
}

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
      // console.log("whole data is:", data);
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
        } else if (data.at(1) == 3) {
          const prefix = Buffer.from([0x05, 0x00, 0x00, 0x01]);
          const ip_buffer = ip_to_buffer("127.0.0.1", PORT);
          s.write(Buffer.concat([prefix, ip_buffer]));
          // udp
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
): {
  host: string;
  port: number;
  offset: number;
  type: "ipv4" | "ipv6" | "domain";
} => {
  if (buffer.at(offset) == 1) {
    offset += 1;
    const ipv4: string[] = [];
    const address = buffer.subarray(offset, offset + 4);
    for (const byte of address) {
      ipv4.push(byte.toString());
    }
    const port = buffer.readUintBE(offset + 4, 2);

    return { host: ipv4.join("."), port, offset: offset + 6, type: "ipv4" };
  } else if (buffer.at(offset) == 3) {
    offset += 1;
    const domain_len = buffer.at(offset);
    offset += 1;
    if (!domain_len) throw new Error("No length found for domain");
    const address = buffer.subarray(offset, offset + domain_len);
    const port = buffer.readUintBE(offset + domain_len, 2);
    const domain = address.toString();
    return {
      host: domain,
      port,
      offset: offset + domain_len + 2,
      type: "domain",
    };
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
    return { host: ipv6str, port, offset: offset + 16 + 2, type: "ipv6" };
  }
};

const ip_to_buffer = (ipv4: string, port: number): Buffer => {
  const ip_buffer = Buffer.from(ipv4.split(".").map((chunk) => +chunk));
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([ip_buffer, port_buffer]);
};
const domain_to_buffer = (domain: string, port: number): Buffer => {
  const domain_length_buffer = Buffer.from([domain.length]);
  const domain_buffer = Buffer.from(domain);
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([domain_length_buffer, domain_buffer, port_buffer]);
};
const ipv6_to_buffer = (ipv6: string, port: number): Buffer => {
  const chunks = ipv6.split(":");
  const ip_buffer = Buffer.allocUnsafe(16);
  let i = 0;
  for (const chunk of chunks) {
    const first_part = chunk[0] + chunk[1];
    const second_part = chunk[2] + chunk[3];
    ip_buffer.writeUInt8(parseInt(first_part, 16), i++);
    ip_buffer.writeUInt8(parseInt(second_part, 16), i++);
  }
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

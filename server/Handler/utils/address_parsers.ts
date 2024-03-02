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

export const ip_to_buffer = (ipv4: string, port: number): Buffer => {
  const ip_buffer = Buffer.from(ipv4.split(".").map((chunk) => +chunk));
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([ip_buffer, port_buffer]);
};

export const domain_to_buffer = (domain: string, port: number): Buffer => {
  const domain_length_buffer = Buffer.from([domain.length]);
  const domain_buffer = Buffer.from(domain);
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([domain_length_buffer, domain_buffer, port_buffer]);
};

export const ipv6_to_buffer = (ipv6: string, port: number): Buffer => {
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

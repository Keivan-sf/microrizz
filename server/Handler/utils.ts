export const parse_addr = (
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

export const ip_to_buffer = (ipv4: string, port: number): Buffer => {
  const ip_buffer = Buffer.from(ipv4.split(".").map((chunk) => +chunk));
  const port_buffer = Buffer.allocUnsafe(2);
  port_buffer.writeUIntBE(port, 0, 2);
  return Buffer.concat([ip_buffer, port_buffer]);
};

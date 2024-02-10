import { WebSocket } from "ws";

const client = new WebSocket("ws://localhost:9092");
function auth() {
  const uname = Buffer.from("admin");
  const pw = Buffer.from("adminpw");
  const b = Buffer.concat([
    Buffer.from([128]),
    Buffer.from([uname.length]),
    uname,
    Buffer.from([pw.length]),
    pw,
  ]);
  console.log("sending ", b);
  client.send(b);
}

function newTask(tid: number) {
  const b = Buffer.allocUnsafe(3);
  b.writeUInt8(129);
  b.writeUIntBE(tid, 1, 2);
  console.log(b);
  console.log(b.readUIntBE(1, 2));
  client.send(b);
}

function connect(tid: number) {
  const b = Buffer.allocUnsafe(3);
  b.writeUInt8(1);
  b.writeUIntBE(tid, 1, 2);
  const domain_buffer = Buffer.from([
    0x03, 0x13, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73, 0x2e, 0x67,
    0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2e, 0x63, 0x6f, 0x6d, 0x01, 0xbb,
  ]);
  const res = Buffer.concat([b, domain_buffer]);
  console.log(res.toString());
  client.send(res);
}

client.on("open", () => {
  // auth();
  newTask(12);
  // connect(12);
});

client.on("message", (data: Buffer) => {
  console.log(data);
  if (data.at(0) == 129) {
    const b = Buffer.allocUnsafe(3);
    b.writeUInt8(129);
    b.writeUIntBE(12, 1, 2);
    if (data.equals(b)) {
      console.log(`client #12 connected for sure`);
      connect(12);
    }
  }
});

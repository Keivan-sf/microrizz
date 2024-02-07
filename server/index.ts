import { WebSocketServer } from "ws";
import express from "express";
import { WSConnection } from "./connection";

export const startServer = () => {
  const app = express();
  const server2 = app.listen(9092);
  const wss = new WebSocketServer({ server: server2 });
  wss.on("connection", (ws) => {
    const client = new WSConnection(ws);
    client.on("data", (data) => {
      console.log("client data:", data);
      client.close();
    });
    client.on("close", () => {
      console.log("wss client closed");
    });
  });

  wss.on("listening", () => {
    console.log("wss is listening on port 9092");
  });
};

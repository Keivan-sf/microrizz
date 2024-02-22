import { WebSocketServer } from "ws";
import express from "express";
import { WSConnection } from "./connection";
import { Client } from "./Handler/handler";
import { NetworkImbalancer } from "./Utils/NetworkImbalancer";
import { config } from "dotenv";
config();
const PORT = process.env.PORT;
const TIME_OUT = 5000;

export const startServer = () => {
  const app = express();
  app.get("/", (req, res) => {
    res.send("<html><h4>Work in progress...</h4></br>Coming soon</html>");
  });
  const server2 = app.listen(PORT);
  const wss = new WebSocketServer({ server: server2 });
  wss.on("connection", (ws) => {
    new Client(new WSConnection(ws), TIME_OUT);
  });

  wss.on("listening", () => {
    console.log(`wss is listening on port ${PORT}`);
  });
  const imbalaner = new NetworkImbalancer(["http://time.ir"], 5000);
  // imbalaner.start();
};

startServer();

import { WebSocketServer } from "ws";
import express, { Router } from "express";
import { WSConnection } from "./connection";
import { Client } from "./Handler/handler";
import { NetworkImbalancer } from "./Utils/NetworkImbalancer";
import { config } from "dotenv";
import { WRTCClient } from "./Lib/WRTC";
import { Readable, Writable } from "stream";
import { sleep } from "./Utils/sleep";
import { HTTPConnection } from "./Lib/HTTP";
config();
const PORT = process.env.PORT ?? 3000;
const TIME_OUT = 15000;

function handle_wrtc_connection(client: WRTCClient) {
  client.on("connection", () => {
    new Client(client, TIME_OUT);
  });
}

function routeWRTC(router: Router) {
  let id_counter = 0;
  const wrtcClients: WRTCClient[] = [];
  router.get("/initiate", (req, res) => {
    const id = ++id_counter;
    const client = new WRTCClient(id);
    handle_wrtc_connection(client);
    wrtcClients.push(client);
    res.send({ id });
  });
  router.post("/offer", async (req, res) => {
    const client = wrtcClients.find((w) => w.id == req.body.id);
    if (!client) {
      res.statusCode = 400;
      res.send({ msg: `no client found with id ${req.body.id}` });
      return;
    }
    console.log("offer:", req.body);
    const answer = await client.getAnswer(req.body.offer);
    res.send({ id: req.body.id, answer });
  });
  router.post("/get-ice-candidate", (req, res) => {
    const client = wrtcClients.find((w) => w.id == req.body.id);
    if (!client) {
      res.statusCode = 400;
      res.send({ msg: `no client found with id ${req.body.id}` });
      return;
    }
    res.send({ id: client.id, candidates: client.getIceCandidates() });
  });
  router.post("/send-ice-candidate", (req, res) => {
    const client = wrtcClients.find((w) => w.id == req.body.id);
    if (!client) {
      res.statusCode = 400;
      res.send({ msg: `no client found with id ${req.body.id}` });
      return;
    }
    console.log("added new candidate from client");
    client.addCandidate(req.body.candidate);
    res.sendStatus(200);
  });
}

export const routeHttpStreaming = (router: Router) => {
  let client_counter = 1;
  router.post("/initiate", (req, res) => {
    client_counter++;
    const http_connection = new HTTPConnection(
      router,
      `client-${client_counter}`,
    );
    new Client(http_connection, TIME_OUT);
    res.send({ id: client_counter });
  });
};

export const startServer = () => {
  const app = express();
  app.get("/", (req, res) => {
    res.send("<html><h4>Work in progress...</h4></br>Coming soon</html>");
  });
  const wrtc_router = express.Router();
  wrtc_router.use(express.json());
  routeWRTC(wrtc_router);
  app.use("/webrtc", wrtc_router);

  const httpStreamingRouter = express.Router();
  routeHttpStreaming(httpStreamingRouter);
  app.use("/http", httpStreamingRouter);

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

import { WebSocket } from "ws";
const client = new WebSocket("ws://localhost:9092");
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

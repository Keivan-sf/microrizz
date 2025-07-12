import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCDataChannel,
  RTCRtpSender,
  RTCRtpTransceiver,
} from "@roamhq/wrtc";
import { Connection } from "../interfaces";

export class WRTCClient implements Connection {
  private ice_candidate_buffer: RTCIceCandidateInit[] = [];
  private peer: RTCPeerConnection;
  private data_channel: RTCDataChannel | null = null;
  private listeners: {
    ondata?: (data: Buffer) => void;
    onclose?: () => void;
    onerror?: (error: any) => void;
    onconnection?: () => void;
  } = {};
  constructor(public id: number) {
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peer.ondatachannel = (e) => {
      this.data_channel = e.channel;
      this.data_channel.onmessage = (ev) => {
        if (this.listeners.ondata) this.listeners.ondata(ev.data);
      };
      this.data_channel.onclose = () => {
        if (this.listeners.onclose) this.listeners.onclose();
      };
      this.data_channel.onerror = (ev) => {
        if (this.listeners.onerror) this.listeners.onerror(ev);
      };
      this.data_channel.onopen = () => {
        if (this.listeners.onconnection) this.listeners.onconnection();
      };
    };
    this.peer.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      this.ice_candidate_buffer.push(ev.candidate);
    };
  }

  public write(data: Buffer) {
    if (!this.data_channel)
      throw new Error("Data channel does not exist for writing");
    this.data_channel.send(data);
  }

  public on(type: "data", cb: (data: Buffer) => void): void;
  public on(type: "close", cb: () => void): void;
  public on(type: "error", cb: (error: any) => void): void;
  public on(type: "connection", cb: () => void): void;
  public on(type: any, cb: any) {
    if (type == "data") {
      this.listeners.ondata = cb;
    } else if (type == "close") {
      this.listeners.onclose = cb;
    } else if (type == "error") {
      this.listeners.onerror = cb;
    } else if (type == "connection") {
      this.listeners.onconnection = cb;
    }
  }

  public close() {
    this.peer.onicecandidate = null;
    this.peer.ontrack = null;
    this.peer.ondatachannel = null;
    this.peer.onicecandidateerror = null;
    this.peer.onnegotiationneeded = null;
    this.peer.onsignalingstatechange = null;
    this.peer.onconnectionstatechange = null;
    this.peer.onicegatheringstatechange = null;
    this.peer.oniceconnectionstatechange = null;
    this.peer.oniceconnectionstatechange = null;
    if (this.data_channel) {
      this.data_channel.onmessage = null;
      this.data_channel.onopen = null;
      this.data_channel.onclose = null;
      this.data_channel.onerror = null;
      this.data_channel.onclosing = null;
      this.data_channel.onbufferedamountlow = null;
    }
    this.peer.close();
  }

  public async getAnswer(offer: any) {
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    return answer;
  }

  public addCandidate(ice: RTCIceCandidateInit) {
    this.peer.addIceCandidate(ice);
  }

  public getIceCandidates(): RTCIceCandidateInit[] {
    const candidates = this.ice_candidate_buffer;
    this.ice_candidate_buffer = [];
    return candidates;
  }
}

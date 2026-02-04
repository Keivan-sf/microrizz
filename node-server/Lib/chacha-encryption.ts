import { Connection } from "../interfaces";
import crypto from "crypto";

export class CHACHAEncryptionWrapper implements Connection {
  constructor(
    private readonly connection: Connection,
    private readonly key: Buffer,
    private readonly config: {
      key_size: number;
      nounce_size: number;
      tag_size: number;
    },
  ) {}
  on(type: "data", cb: (data: Buffer) => void): void;
  on(type: "close", cb: () => void): void;
  on(type: "error", cb: (error: any) => void): void;
  on(type: "connection", cb: () => void): void;
  on(type: any, cb: any): void {
    let modified_callback = cb;
    if (type == "data") {
      modified_callback = (data: Buffer) => {
        cb(this.decrypt(data));
      };
    }
    this.connection.on(type, modified_callback);
  }
  close(): void {
    this.connection.close();
  }
  write(data: Buffer): void {
    this.connection.write(this.encrypt(data));
  }

  private encrypt(data: Buffer): Buffer {
    if (this.key.length !== this.config.key_size) {
      throw new Error("Key must be 32 bytes");
    }

    const nonce = crypto.randomBytes(this.config.nounce_size);

    const cipher = crypto.createCipheriv("chacha20-poly1305", this.key, nonce, {
      authTagLength: this.config.tag_size,
    });

    const cipher_data = Buffer.concat([cipher.update(data), cipher.final()]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([nonce, tag, cipher_data]);
  }

  private decrypt(data: Buffer) {
    if (this.key.length !== this.config.key_size) {
      throw new Error("Key must be 32 bytes");
    }

    const nonce = data.subarray(0, this.config.nounce_size);
    const tag = data.subarray(
      this.config.nounce_size,
      this.config.nounce_size + this.config.tag_size,
    );
    const ciphertext = data.subarray(
      this.config.nounce_size + this.config.tag_size,
    );

    const decipher = crypto.createDecipheriv(
      "chacha20-poly1305",
      this.key,
      nonce,
      {
        authTagLength: this.config.tag_size,
      },
    );

    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

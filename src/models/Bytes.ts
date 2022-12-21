export class Bytes<T extends number> {
  readonly bytes: Buffer;

  constructor(bytes: Uint8Array | Buffer | string) {
    if (bytes instanceof Uint8Array) {
      this.bytes = Buffer.from(bytes);
    } else if (typeof bytes == "string") {
      if (bytes.startsWith("0x")) {
        this.bytes = Buffer.from(bytes.substring(2), "hex");
      } else {
        this.bytes = Buffer.from(bytes, "hex");
      }
    } else {
      this.bytes = bytes;
    }
  }

  get zero(): boolean {
    return this.bytes.every((b) => b == 0);
  }

  equals(other: Bytes<T> | undefined): boolean {
    return other?.bytes.equals(this.bytes) ?? false;
  }

  toString(): string {
    return "0x" + this.bytes.toString("hex");
  }
}

export class Address extends Bytes<20> {
  static zero = new Address(Buffer.alloc(20));
}

export class Hash extends Bytes<32> {}

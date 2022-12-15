export default class Address {
  readonly bytes: Buffer;

  constructor(address: Uint8Array | Buffer | string) {
    if (address instanceof Uint8Array) this.bytes = Buffer.from(address);
    else if (typeof address == "string")
      this.bytes = Buffer.from(address.substring(2), "hex");
    else this.bytes = address;
  }

  equals(other: Address | undefined): boolean {
    return other?.bytes.equals(this.bytes) ?? false;
  }

  toString(): string {
    return "0x" + this.bytes.toString("hex");
  }
}

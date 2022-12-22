import { Address, Bytes, Hash } from "@fancysofthq/supabase";
import { BigNumber } from "ethers";
import { CID } from "multiformats";

export class TalentId {
  constructor(public readonly cid: CID) {}

  static fromJSON(json: any): TalentId {
    return new TalentId(CID.parse(json.cid));
  }

  toJSON(): any {
    return {
      cid: this.cid.toString(),
    };
  }
}

export class Talent extends TalentId {
  constructor(
    cid: CID,
    public readonly author: Address,
    public readonly claimEvent: {
      blockNumber: number;
      logIndex: number;
      txHash: Hash;
    },
    public readonly royalty: number, // 0-1
    public readonly finalized: boolean,
    public readonly expiredAt: Date,
    public readonly editions: BigNumber
  ) {
    super(cid);
  }

  static fromJSON(json: any): Talent {
    return new Talent(
      CID.parse(json.cid),
      Address.from(json.author),
      {
        blockNumber: json.claimEvent.blockNumber,
        logIndex: json.claimEvent.logIndex,
        txHash: Hash.from(json.claimEvent.txHash),
      },
      json.royalty,
      json.finalized,
      new Date(json.expiredAt),
      BigNumber.from(json.editions)
    );
  }

  toJSON(): any {
    return {
      cid: this.cid.toString(),
      author: this.author.toString(),
      claimEvent: {
        blockNumber: this.claimEvent.blockNumber,
        logIndex: this.claimEvent.logIndex,
        txHash: this.claimEvent.txHash.toString(),
      },
      royalty: this.royalty,
      finalized: this.finalized,
      expiredAt: this.expiredAt.valueOf(),
      editions: this.editions.toHexString(),
    };
  }
}

export class TalentBalance {
  constructor(public readonly balance: BigNumber) {}

  static fromJSON(json: any): TalentBalance {
    return new TalentBalance(BigNumber.from(json.balance));
  }

  toJSON(): any {
    return {
      balance: this.balance.toString(),
    };
  }
}

export class ListingId {
  constructor(public readonly id: Bytes<32>) {}

  static fromJSON(json: any): ListingId {
    return new ListingId(Bytes.from<32>(json.id));
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
    };
  }
}

export class Listing extends ListingId {
  constructor(
    id: Bytes<32>,
    public readonly seller: Address,
    public readonly token: {
      contract: Address;
      id: BigNumber;
    },
    public readonly stockSize: BigNumber,
    public readonly price: BigNumber
  ) {
    super(id);
  }

  static fromJSON(json: any): Listing {
    return new Listing(
      Bytes.from<32>(json.id),
      Address.from(json.seller),
      {
        contract: Address.from(json.token.contract),
        id: BigNumber.from(json.token.id),
      },
      BigNumber.from(json.stockSize),
      BigNumber.from(json.price)
    );
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      seller: this.seller.toString(),
      token: {
        contract: this.token.contract.toString(),
        id: this.token.id.toString(),
      },
      stockSize: this.stockSize.toString(),
      price: this.price.toString(),
    };
  }
}

export abstract class Event {
  constructor(
    public readonly blockNumber: number,
    public readonly logIndex: number,
    public readonly txHash: Hash
  ) {}

  abstract toJSON(): any;

  static fromJSON(json: any): Event {
    switch (json.type) {
      case ListEvent.type:
        return ListEvent.fromJSON(json);
      case PurchaseEvent.type:
        return PurchaseEvent.fromJSON(json);
      case TransferEvent.type:
        return TransferEvent.fromJSON(json);
      default:
        throw new Error("Unknown event type");
    }
  }
}

export class ListEvent extends Event {
  static readonly type = "ListEvent";

  constructor(
    blockNumber: number,
    logIndex: number,
    txHash: Hash,
    public readonly listingId: Bytes<32>,
    public readonly seller: Address,
    public readonly price: BigNumber,
    public readonly stockSize: BigNumber
  ) {
    super(blockNumber, logIndex, txHash);
  }

  static fromJSON(json: any): ListEvent {
    return new ListEvent(
      json.blockNumber,
      json.logIndex,
      Hash.from(json.txHash),
      Bytes.from<32>(json.listingId),
      Address.from(json.seller),
      BigNumber.from(json.price),
      BigNumber.from(json.stockSize)
    );
  }

  toJSON(): any {
    return {
      blockNumber: this.blockNumber,
      logIndex: this.logIndex,
      txHash: this.txHash.toString(),
      type: ListEvent.type,
      listingId: this.listingId.toString(),
      seller: this.seller.toString(),
      price: this.price.toHexString(),
      stockSize: this.stockSize.toHexString(),
    };
  }
}

export class PurchaseEvent extends Event {
  static type = "PurchaseEvent";

  constructor(
    blockNumber: number,
    logIndex: number,
    txHash: Hash,
    public readonly listingId: Bytes<32>,
    public readonly buyer: Address,
    public readonly tokenAmount: BigNumber,
    public readonly income: BigNumber
  ) {
    super(blockNumber, logIndex, txHash);
  }

  static fromJSON(json: any): PurchaseEvent {
    return new PurchaseEvent(
      json.blockNumber,
      json.logIndex,
      Hash.from(json.txHash),
      Bytes.from(json.listingId),
      Address.from(json.buyer),
      BigNumber.from(json.tokenAmount),
      BigNumber.from(json.income)
    );
  }

  toJSON(): any {
    return {
      type: PurchaseEvent.type,
      blockNumber: this.blockNumber,
      logIndex: this.logIndex,
      txHash: this.txHash.toString(),
      listingId: this.listingId.toString(),
      buyer: this.buyer.toString(),
      tokenAmount: this.tokenAmount.toHexString(),
      income: this.income.toHexString(),
    };
  }
}

export class TransferEvent extends Event {
  static type = "TransferEvent";

  constructor(
    blockNumber: number,
    logIndex: number,
    public readonly subIndex: number,
    txHash: Hash,
    public readonly operator: Address,
    public readonly from: Address,
    public readonly to: Address,
    public readonly id: BigNumber,
    public readonly value: BigNumber
  ) {
    super(blockNumber, logIndex, txHash);
  }

  static fromJSON(json: any): TransferEvent {
    return new TransferEvent(
      json.blockNumber,
      json.logIndex,
      json.subIndex,
      Hash.from(json.txHash),
      Address.from(json.operator),
      Address.from(json.from),
      Address.from(json.to),
      BigNumber.from(json.id),
      BigNumber.from(json.value)
    );
  }

  toJSON(): any {
    return {
      type: TransferEvent.type,
      blockNumber: this.blockNumber,
      logIndex: this.logIndex,
      subIndex: this.subIndex,
      txHash: this.txHash.toString(),
      operator: this.operator.toString(),
      from: this.from.toString(),
      to: this.to.toString(),
      id: this.id.toHexString(),
      value: this.value.toHexString(),
    };
  }
}

CREATE TABLE
  openstore_replenish (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    listing_id BLOB(32) NOT NULL COLLATE BINARY,
    new_price BLOB(32) NOT NULL, -- BigNumber
    token_amount BLOB(32) NOT NULL, -- BigNumber
    PRIMARY KEY (block_number, log_index)
  );

ALTER TABLE "state" ADD openstore_replenish_block BIGINT;

CREATE INDEX idx_openstore_replenish_listing_id ON openstore_replenish (listing_id);

CREATE TABLE
  openstore_withdraw (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    listing_id BLOB(32) NOT NULL COLLATE BINARY,
    "to" BLOB(32) NOT NULL COLLATE BINARY,
    amount BLOB(32) NOT NULL, -- BigNumber
    PRIMARY KEY (block_number, log_index)
  );

ALTER TABLE "state" ADD openstore_withdraw_block BIGINT;

CREATE INDEX idx_openstore_withdraw_listing_id ON openstore_withdraw (listing_id);

CREATE INDEX idx_openstore_withdraw_to ON openstore_withdraw ("to");

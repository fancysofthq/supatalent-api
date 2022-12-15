CREATE TABLE
  openstore_purchase (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    listing_id BLOB(32) NOT NULL COLLATE BINARY,
    buyer BLOB(32) NOT NULL COLLATE BINARY,
    token_amount BLOB(32) NOT NULL, -- BigNumber
    income BLOB(32) NOT NULL, -- BigNumber
    royalty_address BLOB(32) NOT NULL COLLATE BINARY,
    royalty_value BLOB(32) NOT NULL, -- BigNumber
    app_address BLOB(32) NOT NULL COLLATE BINARY,
    app_fee BLOB(32) NOT NULL, -- BigNumber
    profit BLOB(32) NOT NULL, -- BigNumber
    PRIMARY KEY (block_number, log_index)
  );

ALTER TABLE "state" ADD openstore_purchase_block BIGINT;

CREATE INDEX idx_openstore_purchase_listing_id ON openstore_purchase (listing_id);

CREATE INDEX idx_openstore_purchase_buyer ON openstore_purchase (buyer);

CREATE INDEX idx_openstore_purchase_royalty_address ON openstore_purchase (royalty_address);

CREATE INDEX idx_openstore_purchase_app_address ON openstore_purchase (app_address);

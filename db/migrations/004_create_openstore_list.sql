CREATE TABLE
  openstore_list (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    listing_id BLOB(32) NOT NULL COLLATE BINARY,
    seller BLOB(20) NOT NULL COLLATE BINARY,
    app_address BLOB(20) NOT NULL COLLATE BINARY,
    token_contract BLOB(20) NOT NULL COLLATE BINARY, -- Special
    token_id BLOB(32) NOT NULL COLLATE BINARY, -- Special
    PRIMARY KEY (block_number, log_index)
  );

ALTER TABLE "state" ADD openstore_list_block BIGINT;

CREATE INDEX idx_openstore_list_listing_id ON openstore_list (listing_id);

CREATE INDEX idx_openstore_list_seller ON openstore_list (seller, app_address);

CREATE INDEX idx_openstore_token ON openstore_list (app_address, token_contract, token_id);

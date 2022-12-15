CREATE TABLE
  talent_mint (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    id BLOB(32) COLLATE BINARY NOT NULL,
    finalized BOOL NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    author BLOB(20) NOT NULL COLLATE BINARY, -- Special
    codec INTEGER NOT NULL, -- Special
    PRIMARY KEY (block_number, log_index)
  );

ALTER TABLE "state" ADD talent_mint_block BIGINT;

CREATE INDEX idx_talent_mint_id ON talent_mint (id);

CREATE INDEX idx_talent_mint_author ON talent_mint (author);

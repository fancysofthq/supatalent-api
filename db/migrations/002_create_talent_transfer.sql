CREATE TABLE
  talent_transfer (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    sub_index INT NOT NULL DEFAULT 0,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    operator BLOB(20) NOT NULL COLLATE BINARY,
    "from" BLOB(20) NOT NULL COLLATE BINARY,
    "to" BLOB(20) NOT NULL COLLATE BINARY,
    id BLOB(32) COLLATE BINARY NOT NULL,
    "value" BLOB(32) NOT NULL, -- BigNumber
    PRIMARY KEY (block_number, log_index, sub_index)
  );

ALTER TABLE "state" ADD talent_transfer_single_block BIGINT;

ALTER TABLE "state" ADD talent_transfer_batch_block BIGINT;

CREATE INDEX idx_talent_transfer_operator ON talent_transfer (operator);

CREATE INDEX idx_talent_transfer_from ON talent_transfer ("from");

CREATE INDEX idx_talent_transfer_to ON talent_transfer ("to");

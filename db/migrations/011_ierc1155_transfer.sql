-- ```solidity
-- event TransferSingle(
--     address indexed operator,
--     address indexed from,
--     address indexed to,
--     uint256 id,
--     uint256 value
-- );
-- ```
CREATE TABLE
  ierc1155_transfer (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    sub_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    operator BLOB(20) COLLATE BINARY NOT NULL,
    "from" BLOB(20) COLLATE BINARY NOT NULL,
    "to" BLOB(20) COLLATE BINARY NOT NULL,
    id BLOB(32) NOT NULL,
    value BLOB(32) NOT NULL,
    --
    PRIMARY KEY (block_number, log_index, sub_index)
  );

CREATE INDEX idx_ierc1155_transfer_operator ON ierc1155_transfer (contract_address, operator);

CREATE INDEX idx_ierc1155_transfer_from ON ierc1155_transfer (contract_address, "from");

CREATE INDEX idx_ierc1155_transfer_to ON ierc1155_transfer (contract_address, "to");

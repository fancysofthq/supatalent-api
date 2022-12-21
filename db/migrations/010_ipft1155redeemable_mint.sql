-- ```solidity
-- /// Emitted upon each minting.
-- event Mint(uint256 indexed id, bool finalize, uint64 expiresAt);
-- ```
CREATE TABLE
  ipft1155redeemable_mint (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    id BLOB(32) COLLATE BINARY NOT NULL,
    finalize BOOL NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_ipft1155redeemable_mint_id ON ipft1155redeemable_mint (contract_address, id);

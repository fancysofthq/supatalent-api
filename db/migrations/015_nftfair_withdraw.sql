-- ```solidity
-- event Withdraw (
--   address operator,
--   address indexed app,
--   bytes32 indexed listingId,
--   uint256 amount,
--   address to
-- );
-- ```
CREATE TABLE
  nftfair_withdraw (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    operator BLOB(20) COLLATE BINARY NOT NULL,
    app BLOB(20) COLLATE BINARY NOT NULL,
    listing_id BLOB(32) NOT NULL,
    amount BLOB(32) NOT NULL,
    "to" BLOB(20) COLLATE BINARY NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_nftfair_withdraw_app ON nftfair_withdraw (contract_address, app);

CREATE INDEX idx_nftfair_withdraw_listing_id ON nftfair_withdraw (contract_address, listing_id);

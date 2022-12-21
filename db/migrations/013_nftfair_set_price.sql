-- ```solidity
-- event SetPrice (
--   address operator,
--   address indexed app,
--   bytes32 indexed listingId,
--   uint256 price
-- );
-- ```
CREATE TABLE
  nftfair_set_price (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    operator BLOB(20) COLLATE BINARY NOT NULL,
    app BLOB(20) COLLATE BINARY NOT NULL,
    listing_id BLOB(32) NOT NULL,
    price BLOB(32) NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_nftfair_set_price_app ON nftfair_set_price (contract_address, app);

CREATE INDEX idx_nftfair_set_price_listing_id ON nftfair_set_price (contract_address, listing_id);

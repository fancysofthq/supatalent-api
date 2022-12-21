-- ```solidity
-- event List (
--   address operator,
--   address indexed app,
--   bytes32 listingId,
--   Token token,
--   Token indexed tokenIndex,
--   address indexed seller,
--   uint256 price,
--   uint256 stockSize
-- );
-- ```
CREATE TABLE
  nftfair_list (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    operator BLOB(20) COLLATE BINARY NOT NULL,
    app BLOB(20) COLLATE BINARY NOT NULL,
    listing_id BLOB(32) NOT NULL,
    token_contract BLOB(20) COLLATE BINARY NOT NULL,
    token_id BLOB(32) COLLATE BINARY NOT NULL,
    seller BLOB(20) COLLATE BINARY NOT NULL,
    price BLOB(32) NOT NULL,
    stock_size BLOB(32) NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_nftfair_list_app ON nftfair_list (contract_address, app);

CREATE INDEX idx_nftfair_list_token ON nftfair_list (contract_address, token_contract, token_id);

CREATE INDEX idx_nftfair_list_seller ON nftfair_list (contract_address, seller);

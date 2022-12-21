-- ```solidity
-- event Purchase(
--     address operator,
--     address indexed app,
--     bytes32 indexed listingId,
--     address indexed buyer,
--     uint256 tokenAmount,
--     address sendTo,
--     uint256 income,
--     address royaltyAddress,
--     uint256 royaltyValue,
--     uint256 appFee,
--     uint256 sellerProfit
-- );
-- ```
CREATE TABLE
  nftfair_purchase (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    operator BLOB(20) COLLATE BINARY NOT NULL,
    app BLOB(20) COLLATE BINARY NOT NULL,
    listing_id BLOB(32) NOT NULL,
    buyer BLOB(20) COLLATE BINARY NOT NULL,
    token_amount BLOB(32) NOT NULL,
    send_to BLOB(20) COLLATE BINARY NOT NULL,
    income BLOB(32) NOT NULL,
    royalty_address BLOB(20) COLLATE BINARY NOT NULL,
    royalty_value BLOB(32) NOT NULL,
    app_fee BLOB(32) NOT NULL,
    seller_profit BLOB(32) NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_nftfair_purchase_app ON nftfair_purchase (contract_address, app);

CREATE INDEX idx_nftfair_purchase_listing_id ON nftfair_purchase (contract_address, listing_id);

CREATE INDEX idx_nftfair_purchase_buyer ON nftfair_purchase (contract_address, buyer);

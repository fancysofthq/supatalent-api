-- ```solidity
-- event Claim(
--     bytes32 indexed contentId, // Also the token ID, and multihash digest
--     address indexed contentAuthor,
--     uint32 contentCodec,
--     uint32 multihashCodec
-- );
-- ```
CREATE TABLE
  iipnft_claim (
    block_number BIGINT NOT NULL,
    log_index INT NOT NULL,
    tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    --
    content_id BLOB(32) NOT NULL COLLATE BINARY,
    content_author BLOB(20) NOT NULL COLLATE BINARY,
    content_codec INT NOT NULL,
    multihash_codec INT NOT NULL,
    --
    PRIMARY KEY (block_number, log_index)
  );

CREATE INDEX idx_iipnft_claim_content_id ON iipnft_claim (contract_address, content_id);

CREATE INDEX idx_iipnft_claim_content_author ON iipnft_claim (contract_address, content_author);

DROP TABLE openstore_purchase;

DROP TABLE openstore_withdraw;

DROP TABLE openstore_replenish;

DROP TABLE openstore_list;

DROP TABLE talent_mint;

DROP TABLE talent_transfer;

DROP TABLE state;

CREATE TABLE
  sync_jobs (
    event_table OID NOT NULL,
    contract_address BLOB(20) NOT NULL COLLATE BINARY,
    contract_deploy_tx_hash BLOB(32) NOT NULL COLLATE BINARY,
    historical_block BIGINT,
    realtime_block BIGINT,
    --
    PRIMARY KEY (event_table, contract_address)
  );

import db from "@/services/db";
import { Job } from "@/shared/sync";
import * as syncjobs from "@/models/syncjobs";
import config from "@/config";

export async function runSyncJobs(cancel: () => boolean) {
  await Promise.all(
    [
      initSyncJob(syncjobs.IIPNFTClaimJob, {
        contractAddress: config.eth.talentAddress,
        contractDeployTx: config.eth.talentTx,
      }),
      initSyncJob(syncjobs.IPNFT1155RedeemableMintJob, {
        contractAddress: config.eth.talentAddress,
        contractDeployTx: config.eth.talentTx,
      }),
      initSyncJob(syncjobs.IERC1155TransferSingleJob, {
        contractAddress: config.eth.talentAddress,
        contractDeployTx: config.eth.talentTx,
      }),
      initSyncJob(syncjobs.IERC1155TransferBatchJob, {
        contractAddress: config.eth.talentAddress,
        contractDeployTx: config.eth.talentTx,
      }),
      initSyncJob(syncjobs.NFTFairListJob, {
        contractAddress: config.eth.nftFairAddress,
        contractDeployTx: config.eth.nftFairTx,
      }),
      initSyncJob(syncjobs.NFTFairPurchaseJob, {
        contractAddress: config.eth.nftFairAddress,
        contractDeployTx: config.eth.nftFairTx,
      }),
      initSyncJob(syncjobs.NFTFairReplenishJob, {
        contractAddress: config.eth.nftFairAddress,
        contractDeployTx: config.eth.nftFairTx,
      }),
      initSyncJob(syncjobs.NFTFairSetPriceJob, {
        contractAddress: config.eth.nftFairAddress,
        contractDeployTx: config.eth.nftFairTx,
      }),
      initSyncJob(syncjobs.NFTFairWithdrawJob, {
        contractAddress: config.eth.nftFairAddress,
        contractDeployTx: config.eth.nftFairTx,
      }),
    ].map((job) => job.run(cancel))
  );
}

const insertStmt = db.prepare(
  `INSERT INTO sync_jobs (
    event_table,
    contract_address,
    contract_deploy_tx_hash
  ) VALUES (?, ?, ?)
  ON CONFLICT DO NOTHING`
);

function initSyncJob<T extends Job>(
  type: { new (dto: syncjobs.Config): T },
  config: syncjobs.Config
): T {
  const obj = new type(config);

  insertStmt.run(
    obj.eventTable,
    config.contractAddress.bytes,
    config.contractDeployTx.bytes
  );

  return obj;
}

export interface HorizonOperation {
  id: string;
  paging_token: string;
  transaction_hash: string;
  type: string;
  type_i: number;
  created_at: string;
  source_account: string;
  // payment fields
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  amount?: string;
  // invoke_host_function fields
  function?: string;
  contract_id?: string;
}

export interface HorizonTransaction {
  id: string;
  hash: string;
  paging_token: string;
  ledger: number;
  created_at: string;
  source_account: string;
  fee_charged: string;
  successful: boolean;
  memo_type: string;
  memo?: string;
}

export interface IndexerState {
  lastPagingToken: string | null;
  lastIndexedAt: Date | null;
}

// Contract event types we care about
export interface BountyEscrowedEvent {
  bounty_id: string;
  creator: string;
  amount: string;
  asset: string;
}

export interface BountyClaimedEvent {
  bounty_id: string;
  claimant: string;
}

export interface BountyReleasedEvent {
  bounty_id: string;
  claimant: string;
  amount: string;
}

export interface BountyDisputedEvent {
  bounty_id: string;
  disputer: string;
  reason: string;
}

export type ContractEvent =
  | { type: 'bounty_escrowed'; data: BountyEscrowedEvent }
  | { type: 'bounty_claimed'; data: BountyClaimedEvent }
  | { type: 'bounty_released'; data: BountyReleasedEvent }
  | { type: 'bounty_disputed'; data: BountyDisputedEvent };

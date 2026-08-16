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

import { api } from "@/lib/fetch";

export interface Transaction {
  _id: string;
  userId: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND';
  method: 'BANK' | 'CARD' | 'SYSTEM' | 'BALANCE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description?: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

export const transactionService = {
  getUserTransactions: async (params?: any) => {
    return api.get<Transaction[]>("/transactions", { params });
  },

  getTransactionById: async (id: string) => {
    return api.get<Transaction>(`/transactions/${id}`);
  },
};

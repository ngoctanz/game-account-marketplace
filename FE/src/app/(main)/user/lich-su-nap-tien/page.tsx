"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, CreditCard, Search, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { transactionService } from "@/services/transaction.service";

export default function TopupHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionService.getUserTransactions(),
  });

  // Filter only DEPOSIT transactions for Topup History
  const topups = transactions.filter((t: any) => t.type === 'DEPOSIT');

  const filteredHistory = topups.filter((item: any) => {
    const code = item.code || item._id;
    const matchesSearch = code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map API method to local filter
    let localMethod = "other";
    if (item.method === "BANK") localMethod = "bank";
    if (item.method === "CARD") localMethod = "card";
    
    const matchesFilter = filter === "all" || localMethod === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Thành công</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Đang xử lý</Badge>;
      case "FAILED":
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Thất bại</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getMethodIcon = (method: string) => {
    if (method === "BANK") {
      return <div className="flex items-center gap-1.5 text-blue-600 font-medium"><QrCode className="w-4 h-4" /> VietQR</div>;
    }
    if (method === "CARD") {
      return <div className="flex items-center gap-1.5 text-orange-600 font-medium"><CreditCard className="w-4 h-4" /> Thẻ cào</div>;
    }
    return <Badge variant="outline">{method}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">Lịch sử nạp tiền</h1>
      <p className="text-slate-500 mb-8">Theo dõi các giao dịch nạp tiền vào tài khoản của bạn.</p>
      
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Danh sách giao dịch</CardTitle>
              <CardDescription>Hiển thị các giao dịch nạp tiền của bạn</CardDescription>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm mã giao dịch..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Phương thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="bank">Chuyển khoản</SelectItem>
                  <SelectItem value="card">Thẻ cào</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-bold">Mã GD</TableHead>
                  <TableHead className="font-bold">Thời gian</TableHead>
                  <TableHead className="font-bold">Phương thức</TableHead>
                  <TableHead className="font-bold text-right">Số tiền</TableHead>
                  <TableHead className="font-bold text-center">Trạng thái</TableHead>
                  <TableHead className="font-bold hidden md:table-cell">Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <p>Đang tải dữ liệu...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-mono font-medium">{item.code || item._id.substring(0, 8)}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {format(new Date(item.createdAt), "HH:mm - dd/MM/yyyy", { locale: vi })}
                      </TableCell>
                      <TableCell>{getMethodIcon(item.method)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        +{item.amount.toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm text-slate-500 hidden md:table-cell">{item.description || "Nạp tiền vào tài khoản"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      Chưa có giao dịch nạp tiền nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <p>Hiển thị {filteredHistory.length} kết quả</p>
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-500 px-3 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-900/30">
              <Clock className="w-3.5 h-3.5" />
              <span>Giao dịch chuyển khoản có thể mất 1-3 phút để cập nhật.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

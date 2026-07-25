"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, QrCode, ArrowRight, Copy, Wallet, ChevronLeft, Info, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/auth-context";

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export function TopupForm() {
  const { user } = useAuthContext();
  const [amount, setAmount] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1);
  const [network, setNetwork] = useState<string>("viettel");
  const [pin, setPin] = useState<string>("");
  const [serial, setSerial] = useState<string>("");

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPin = pin.replace(/\s+/g, '');
    const cleanSerial = serial.replace(/\s+/g, '');
    
    if (!/^\d+$/.test(cleanPin) || !/^\d+$/.test(cleanSerial)) {
      toast.error("Lỗi định dạng", { description: "Mã thẻ và số serial chỉ bao gồm chữ số." });
      return;
    }

    let isValid = false;
    let errorMsg = "";
    if (network === "viettel") {
      if ((cleanPin.length === 13 || cleanPin.length === 15) && (cleanSerial.length === 11 || cleanSerial.length === 14)) {
        isValid = true;
      } else {
        errorMsg = "Thẻ Viettel cần mã PIN 13/15 số và Serial 11/14 số.";
      }
    } else if (network === "vinaphone") {
      if (cleanPin.length === 14 && cleanSerial.length === 14) {
        isValid = true;
      } else {
        errorMsg = "Thẻ Vinaphone cần mã PIN 14 số và Serial 14 số.";
      }
    } else if (network === "mobifone") {
      if (cleanPin.length === 12 && cleanSerial.length === 15) {
        isValid = true;
      } else {
        errorMsg = "Thẻ Mobifone cần mã PIN 12 số và Serial 15 số.";
      }
    }

    if (!isValid) {
      toast.error("Sai định dạng thẻ", { description: errorMsg });
      return;
    }

    toast.error("Bảo trì hệ thống", {
      description: "Cổng thanh toán thẻ cào đang bảo trì. Vui lòng thử lại sau hoặc liên hệ Admin.",
      action: {
        label: "Hỗ trợ",
        onClick: () => window.open("https://github.com/ngoctanz", "_blank"),
      },
      duration: 5000,
    });
  };

  const handleBankNext = () => {
    if (!amount || parseInt(amount) < 10000) {
      toast.error("Số tiền không hợp lệ", { description: "Số tiền nạp tối thiểu là 10,000đ" });
      return;
    }
    setStep(2);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép " + label, { duration: 2000 });
  };

  const transferContent = user?._id 
    ? `SHOPACVN ${user._id.slice(-6).toUpperCase()}` 
    : `SHOPACVN ${Math.floor(Math.random() * 900000 + 100000)}`;
    
  const qrUrl = `https://img.vietqr.io/image/970422-99099990999-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=LE NGOC TAN`;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-slate-700 dark:text-slate-300" /> Nạp tiền
          </h1>
          <p className="text-slate-500 text-sm mt-1">Nạp tiền vào tài khoản để mua sắm.</p>
        </div>
        {user && (
          <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-start sm:items-end">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Số dư hiện tại</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{user.balance.toLocaleString('vi-VN')}đ</span>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="bank" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="bank" className="flex gap-2">
            <QrCode className="h-4 w-4" />
            Chuyển khoản (Khuyên dùng)
          </TabsTrigger>
          <TabsTrigger value="card" className="flex gap-2">
            <CreditCard className="h-4 w-4" />
            Thẻ cào
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bank" className="space-y-4">
          <Card className="shadow-none border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                {step === 1 ? (
                  "1. Nhập số tiền"
                ) : (
                  <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-slate-500" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {step === 1 ? "Nhập số tiền bạn muốn nạp vào tài khoản." : "Quét mã QR qua ứng dụng ngân hàng hoặc ví điện tử để thanh toán."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              {step === 1 ? (
                <div className="max-w-md mx-auto space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="font-medium text-slate-700 dark:text-slate-300">Số tiền nạp (VNĐ)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="text-lg h-12"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((val) => (
                      <Button 
                        key={val} 
                        type="button" 
                        variant="outline" 
                        className={`h-10 text-sm ${amount === val.toString() ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}`}
                        onClick={() => setAmount(val.toString())}
                      >
                        {val.toLocaleString('vi-VN')}
                      </Button>
                    ))}
                  </div>
                  
                  <Button onClick={handleBankNext} className="w-full h-12 mt-4" disabled={!amount || parseInt(amount) < 10000}>
                    Tiếp tục thanh toán
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
                  {/* Left: QR Code */}
                  <div className="flex flex-col items-center p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/30 mx-auto w-full max-w-[280px]">
                    <div className="bg-white p-2 rounded-lg mb-4 shadow-sm border border-slate-100">
                      <img 
                        src={qrUrl} 
                        alt="VietQR" 
                        className="w-48 h-48 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-48 h-48 flex items-center justify-center">
                         <QRCodeSVG value={`https://vietqr.net/portal/MBBank/99099990999/${amount}/${transferContent}`} size={180} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
                      Quét mã để thanh toán tự động
                    </p>
                  </div>

                  {/* Right: Transfer Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                      Thông tin chuyển khoản
                    </h3>
                    
                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">Ngân hàng</span>
                        <span className="col-span-2 font-medium">MB Bank (NH Quân Đội)</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">Chủ tài khoản</span>
                        <span className="col-span-2 font-medium">LE NGOC TAN</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="text-slate-500">Số tài khoản</span>
                        <div className="col-span-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800">
                          <span className="font-mono font-medium">99099990999</span>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500" onClick={() => copyToClipboard('99099990999', 'Số tài khoản')}>
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="text-slate-500">Số tiền</span>
                        <span className="col-span-2 font-medium text-base">{parseInt(amount).toLocaleString('vi-VN')} đ</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-start">
                        <span className="text-slate-500 pt-2">Nội dung <span className="text-red-500">*</span></span>
                        <div className="col-span-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800/50">
                          <span className="font-mono font-medium text-blue-700 dark:text-blue-400 break-all">{transferContent}</span>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-600 dark:text-blue-400 shrink-0" onClick={() => copyToClipboard(transferContent, 'Nội dung')}>
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-md items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-500 leading-relaxed">
                        Vui lòng chuyển đúng <strong className="font-semibold">Nội dung</strong> để hệ thống xử lý giao dịch tự động. Nếu sai nội dung, giao dịch sẽ cần xử lý thủ công.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="card" className="space-y-6">
          <Card className="shadow-none border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg">Nạp thẻ cào</CardTitle>
              <CardDescription>
                Hỗ trợ Viettel, Vinaphone, Mobifone. Chiết khấu được áp dụng tự động.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
                {/* Form */}
                <form onSubmit={handleCardSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="network">Nhà mạng</Label>
                      <Select value={network} onValueChange={setNetwork}>
                        <SelectTrigger id="network">
                          <SelectValue placeholder="Chọn nhà mạng" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viettel">Viettel</SelectItem>
                          <SelectItem value="vinaphone">Vinaphone</SelectItem>
                          <SelectItem value="mobifone">Mobifone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="card-amount">Mệnh giá</Label>
                      <Select defaultValue="50000">
                        <SelectTrigger id="card-amount">
                          <SelectValue placeholder="Chọn mệnh giá" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10000">10,000đ</SelectItem>
                          <SelectItem value="20000">20,000đ</SelectItem>
                          <SelectItem value="50000">50,000đ</SelectItem>
                          <SelectItem value="100000">100,000đ</SelectItem>
                          <SelectItem value="200000">200,000đ</SelectItem>
                          <SelectItem value="500000">500,000đ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pin">Mã thẻ (PIN)</Label>
                    <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Nhập mã thẻ..." required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="serial">Số Serial</Label>
                    <Input id="serial" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Nhập số serial..." required />
                  </div>
                  
                  <Button type="submit" className="w-full mt-2">
                    Xác nhận nạp thẻ
                  </Button>
                </form>

                {/* Info sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800 text-sm">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-slate-500" /> Lưu ý quan trọng
                    </h4>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-400 list-disc pl-4">
                      <li>Chọn <strong>SAI MỆNH GIÁ</strong> sẽ bị trừ 50% giá trị thẻ thực hoặc mất thẻ.</li>
                      <li>Thời gian xử lý thẻ từ 1-3 phút.</li>
                      <li>Không hỗ trợ thẻ đã qua sử dụng.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="text-xs h-8">Nhà mạng</TableHead>
                          <TableHead className="text-xs h-8 text-right">Chiết khấu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="py-2 text-sm">Viettel</TableCell>
                          <TableCell className="py-2 text-sm text-right">16%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-2 text-sm">Vinaphone</TableCell>
                          <TableCell className="py-2 text-sm text-right">17%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-2 text-sm">Mobifone</TableCell>
                          <TableCell className="py-2 text-sm text-right">18%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Archive, Calendar, Download, Eye } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Archives() {
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const { data: shifts, isLoading } = trpc.shifts.list.useQuery();
  const archiveShiftMutation = trpc.shifts.archive.useMutation({
    onSuccess: () => {
      utils.shifts.list.invalidate();
    },
  });
  const utils = trpc.useUtils();

  const archivedShifts = shifts?.filter(s => s.isArchived) || [];
  const activeShifts = shifts?.filter(s => !s.isArchived) || [];

  const filteredArchives = selectedYear 
    ? archivedShifts.filter(s => s.year === selectedYear)
    : archivedShifts;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleArchive = async (shiftId: number) => {
    if (confirm("このシフトをアーカイブしますか？")) {
      await archiveShiftMutation.mutateAsync({ id: shiftId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">アーカイブ</h1>
          <p className="text-muted-foreground mt-2">過去のシフトデータを管理</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>現在のシフト</CardTitle>
            <CardDescription>アーカイブ可能なシフト</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : activeShifts.length > 0 ? (
              <div className="space-y-2">
                {activeShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">{shift.year}年{shift.month}月 - {shift.name}</div>
                        <div className="text-sm text-muted-foreground">
                          作成日: {new Date(shift.createdAt).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                      <Badge>{shift.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setLocation(`/admin/shifts/\${shift.id}/edit`)}>
                        <Eye className="h-4 w-4 mr-2" />表示
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleArchive(shift.id)}>
                        <Archive className="h-4 w-4 mr-2" />アーカイブ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">現在のシフトはありません</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>アーカイブ済みシフト</CardTitle>
                <CardDescription>過去5年分のシフトデータ</CardDescription>
              </div>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : filteredArchives.length > 0 ? (
              <div className="space-y-2">
                {filteredArchives.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Archive className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">{shift.year}年{shift.month}月 - {shift.name}</div>
                        <div className="text-sm text-muted-foreground">
                          アーカイブ日: {shift.archivedAt ? new Date(shift.archivedAt).toLocaleDateString("ja-JP") : "-"}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/admin/shifts/\${shift.id}/edit`)}>
                      <Eye className="h-4 w-4 mr-2" />閲覧
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{selectedYear}年のアーカイブはありません</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

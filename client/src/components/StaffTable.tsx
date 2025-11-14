import { Pencil, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import type { StaffTableProps } from "../types/staffManagementTypes";

export function StaffTable({ employees, onViewDetail, onEdit, onDeleteClick }: StaffTableProps) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>役職グループ</TableHead>
            <TableHead>スキルレベル</TableHead>
            <TableHead>夜勤可否</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                職員が登録されていません
              </TableCell>
            </TableRow>
          ) : (
            employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div>{employee.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {employee.employeeId || '未設定'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{employee.positionGroupName}</Badge>
                </TableCell>
                <TableCell>{employee.skillLevel}%</TableCell>
                <TableCell>
                  <Badge variant={employee.canWorkNight ? "default" : "secondary"}>
                    {employee.canWorkNight ? "可" : "不可"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(employee.id)}
                      className="rounded-lg"
                    >
                      詳細
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(employee)}
                      className="rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteClick(employee.id)}
                      className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

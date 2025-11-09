import { createContext, useContext, useState, ReactNode } from "react";

export interface VacationRequest {
  id: string;
  staffName: string;
  staffId: string;
  month: string;
  requests: {
    day: number;
    type: "休" | "有休" | "時間指定";
    startTime?: string;
    endTime?: string;
    reason?: string;
  }[];
  submittedAt: Date;
  status: "pending" | "approved" | "rejected";
}

interface VacationContextType {
  vacationRequests: VacationRequest[];
  addVacationRequest: (request: Omit<VacationRequest, "id" | "submittedAt" | "status">) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  deadline: Date;
  setDeadline: (date: Date) => void;
}

const VacationContext = createContext<VacationContextType | undefined>(undefined);

export function VacationProvider({ children }: { children: ReactNode }) {
  // 締め切り日の状態（デフォルト: 11月15日 23:59）
  const [deadline, setDeadline] = useState<Date>(new Date(2025, 10, 15, 23, 59, 59));
  
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    // デモ用の初期データ
    {
      id: "req-001",
      staffName: "山田花子",
      staffId: "staff-001",
      month: "2025年12月",
      requests: [
        { day: 5, type: "有休", reason: "家族の用事" },
        { day: 12, type: "休" },
        { day: 25, type: "時間指定", startTime: "14:00", endTime: "18:00", reason: "通院" },
      ],
      submittedAt: new Date("2024-11-08T10:30:00"),
      status: "pending",
    },
    {
      id: "req-002",
      staffName: "佐藤美咲",
      staffId: "staff-002",
      month: "2025年12月",
      requests: [
        { day: 3, type: "有休" },
        { day: 10, type: "休", reason: "私用" },
        { day: 24, type: "有休" },
      ],
      submittedAt: new Date("2024-11-08T09:15:00"),
      status: "pending",
    },
    {
      id: "req-003",
      staffName: "田中さくら",
      staffId: "staff-003",
      month: "2025年12月",
      requests: [
        { day: 8, type: "休" },
        { day: 15, type: "時間指定", startTime: "10:00", endTime: "12:00" },
      ],
      submittedAt: new Date("2024-11-07T16:45:00"),
      status: "approved",
    },
  ]);

  const addVacationRequest = (request: Omit<VacationRequest, "id" | "submittedAt" | "status">) => {
    const newRequest: VacationRequest = {
      ...request,
      id: `req-${Date.now()}`,
      submittedAt: new Date(),
      status: "pending",
    };
    setVacationRequests((prev) => [newRequest, ...prev]);
  };

  const approveRequest = (id: string) => {
    setVacationRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: "approved" as const } : req))
    );
  };

  const rejectRequest = (id: string) => {
    setVacationRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: "rejected" as const } : req))
    );
  };

  return (
    <VacationContext.Provider
      value={{
        vacationRequests,
        addVacationRequest,
        approveRequest,
        rejectRequest,
        deadline,
        setDeadline,
      }}
    >
      {children}
    </VacationContext.Provider>
  );
}

export function useVacation() {
  const context = useContext(VacationContext);
  if (context === undefined) {
    throw new Error("useVacation must be used within a VacationProvider");
  }
  return context;
}

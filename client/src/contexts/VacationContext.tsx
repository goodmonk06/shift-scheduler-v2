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
  
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);

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

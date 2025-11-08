import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/admin/Dashboard";
import Employees from "./pages/admin/Employees";
import PositionGroups from "./pages/admin/PositionGroups";
import WorkTimeSlots from "./pages/admin/WorkTimeSlots";
import WorkplaceRules from "./pages/admin/WorkplaceRules";
import RequiredStaffing from "./pages/admin/RequiredStaffing";
import Shifts from "./pages/admin/Shifts";
import ShiftEditor from "./pages/admin/ShiftEditor";
import LeaveRequests from "./pages/admin/LeaveRequests";
import ChangeProposals from "./pages/admin/ChangeProposals";
import Reports from "./pages/admin/Reports";
import EmergencyNotifications from "./pages/admin/EmergencyNotifications";
import Archives from "./pages/admin/Archives";
import EmployeeHome from "./pages/employee/EmployeeHome";
import EmployeeShifts from "./pages/employee/EmployeeShifts";
import EmployeeLeaveRequests from "./pages/employee/EmployeeLeaveRequests";
import EmployeeChangeProposals from "./pages/employee/EmployeeChangeProposals";
import EmployeeProfile from "./pages/admin/EmployeeProfile";
import EmployeeLogin from "./pages/employee/EmployeeLogin";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/employees"} component={Employees} />
      <Route path="/employees/:id" component={EmployeeProfile} />
      <Route path={"/position-groups"} component={PositionGroups} />
      <Route path={"/work-time-slots"} component={WorkTimeSlots} />
      <Route path={"/workplace-rules"} component={WorkplaceRules} />
      <Route path={"/required-staffing"} component={RequiredStaffing} />
      <Route path="/shifts" component={Shifts} />
      <Route path="/shifts/:id/edit" component={ShiftEditor} />
      <Route path="/admin/leave-requests" component={LeaveRequests} />
      <Route path="/leave-requests" component={LeaveRequests} />
      <Route path="/change-proposals" component={ChangeProposals} />
      <Route path="/reports" component={Reports} />
      <Route path="/emergency-notifications" component={EmergencyNotifications} />
      <Route path="/archives" component={Archives} />
      <Route path="/employee/login" component={EmployeeLogin} />
      <Route path="/employee" component={EmployeeHome} />
      <Route path="/employee/shifts" component={EmployeeShifts} />
      <Route path="/employee/leave-requests" component={EmployeeLeaveRequests} />
      <Route path="/employee/change-proposals" component={EmployeeChangeProposals} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

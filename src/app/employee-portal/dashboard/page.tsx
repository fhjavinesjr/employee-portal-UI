import AuthGuard from "@/app/employee-portal/AuthGuard";
import Main from "@/app/employee-portal/main/Main";
import Dashboard from "./Dashboard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Main>
        <Dashboard />
      </Main>
    </AuthGuard>
  );
}

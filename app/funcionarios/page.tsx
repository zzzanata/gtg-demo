import EmployeeGrid from "@/components/EmployeeGrid";
import { requireAdmin } from "@/lib/auth";
import { getEmployees } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireAdmin();
  const employees = await getEmployees();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
        <p className="text-sm text-slate-500">
          {employees.length} {employees.length === 1 ? "funcionário cadastrado" : "funcionários cadastrados"}
        </p>
      </header>
      <EmployeeGrid employees={employees} />
    </div>
  );
}

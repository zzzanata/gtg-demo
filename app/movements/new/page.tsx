import MovementForm from "@/components/MovementForm";
import { getProducts, getSuppliers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewMovementPage() {
  const [products, suppliers] = await Promise.all([getProducts(), getSuppliers()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nova movimentação</h1>
        <p className="text-sm text-slate-500">Registre uma entrada, saída ou ajuste</p>
      </header>
      <MovementForm products={products} suppliers={suppliers} />
    </div>
  );
}

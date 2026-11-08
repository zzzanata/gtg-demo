import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
        <p className="text-sm text-slate-500">
          Se informar estoque inicial, ele entra como uma movimentação de entrada
        </p>
      </header>
      <ProductForm categories={categories} />
    </div>
  );
}

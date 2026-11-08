import ProductGrid from "@/components/ProductGrid";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories, user] = await Promise.all([
    getProducts(),
    getCategories(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <p className="text-sm text-slate-500">O que a empresa tem em estoque, com quantidade e valor</p>
      </header>
      <ProductGrid products={products} categories={categories} canEdit={user?.role === "ADMIN"} />
    </div>
  );
}

/**
 * Custo médio ponderado após uma entrada.
 * Ex.: 10 un a R$ 100 + 10 un a R$ 120 => R$ 110.
 * Se o saldo atual é zero (ou negativo), o custo passa a ser o da compra.
 */
export function weightedAverage(
  currentStock: number,
  currentCost: number,
  qtyIn: number,
  unitCostIn: number,
): number {
  if (currentStock <= 0) return unitCostIn;
  const total = currentStock * currentCost + qtyIn * unitCostIn;
  return total / (currentStock + qtyIn);
}

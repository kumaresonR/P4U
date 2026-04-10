/** Map API order payloads (Prisma) to the shape customer UI expects (`items`, `tax`, etc.). */

export function lineItemsFromOrder(o: any): any[] {
  if (!o) return [];
  if (Array.isArray(o.items) && o.items.length) return o.items;
  if (Array.isArray(o.orderItems) && o.orderItems.length) {
    return o.orderItems.map((row: any) => ({
      id: row.product_id,
      title: row.title,
      qty: row.qty,
      price: row.price,
      image: row.image,
      emoji: row.emoji,
    }));
  }
  const j = o.items_json;
  if (j && Array.isArray(j)) {
    return j.map((row: any) => ({
      id: row.id || row.product_id,
      title: row.title,
      qty: row.qty,
      price: row.price,
      image: row.image,
      emoji: row.emoji,
    }));
  }
  return [];
}

export function normalizeCustomerOrderPayload(o: any) {
  if (!o) return o;
  const items = lineItemsFromOrder(o);
  return {
    ...o,
    items,
    tax: Number(o.tax ?? o.tax_amount ?? 0),
    vendor_name: o.vendor_name ?? o.vendor?.business_name ?? o.vendor?.name ?? '',
    platform_fee: Number(o.platform_fee ?? 0),
    gst_on_platform_fee: Number(o.gst_on_platform_fee ?? 0),
  };
}

/** Maps backend order status to a 0–4 tracking step (CustomerOrdersPage / detail). */
export function orderStatusToTrackingStep(status: string): number {
  const map: Record<string, number> = {
    placed: 0,
    paid: 0,
    accepted: 1,
    in_progress: 2,
    shipped: 2,
    delivered: 3,
    completed: 4,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

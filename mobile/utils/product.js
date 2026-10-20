// Shared product helpers used across mobile screens.

export const PRODUCT_TYPES = [
  'optical_frame',
  'sunglasses',
  'lenses',
  'contact_lenses',
  'accessory',
];

// Filter tabs shown under the search bar.
// - kind 'type'    -> matches the backend product_type field exactly.
// - kind 'keyword' -> client-side match on name/description/category/brand.
// Men/Women are keyword-based because the backend has no gender field.
// Helper to build filter tabs from the categories fetched from the backend.
// Always includes an "All" tab at the start.
export function buildFilterTabs(categories) {
  const tabs = [{ id: 'all', label: 'All', kind: 'all', value: null }];
  
  for (const c of categories) {
    tabs.push({
      id: `cat-${c.id}`,
      label: c.name,
      kind: 'category',
      value: c.name, // We match against product.category_name
    });
  }
  
  return tabs;
}

export function price(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `R ${number.toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Price unavailable';
}

export function category(product) {
  return String(
    product.category_name ||
      product.category?.name ||
      product.product_type ||
      'Eyewear'
  )
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function imageFor(product) {
  const image =
    product.primary_image ||
    product.image_url ||
    product.imageUrl ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.url;

  if (typeof image === 'string') return image;
  if (image && typeof image === 'object') {
    return image.image_url || image.url || null;
  }
  return null;
}

// Applies the search query and the active filter tab to a product list.
export function applyFilters(products, query, activeTab) {
  const q = query.trim().toLowerCase();

  return products.filter((product) => {
    // 1. Search query
    if (q) {
      const haystack = [
        product.name,
        product.description,
        product.product_type,
        product.category_name,
        product.brand_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // 2. Tabs
    if (!activeTab || activeTab.kind === 'all') return true;

    if (activeTab.kind === 'category') {
      return product.category_name === activeTab.value;
    }

    return true;
  });
}
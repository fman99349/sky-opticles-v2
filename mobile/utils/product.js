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
// Builds a two-level hierarchy of tabs from the flat categories list.
// Returns { parents, childrenByParent }.
export function buildTabHierarchy(categories) {
  const parents = [{ id: 'all', label: 'All', rawId: null }];
  const childrenByParent = { all: [] };

  // 1. Get top-level categories (no parent_id)
  const topLevel = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id);

  // 2. Build parent tabs and an "All [Parent]" sub-tab for each
  topLevel.forEach((p) => {
    const parentKey = `p-${p.id}`;
    parents.push({ id: parentKey, label: p.name, rawId: p.id });
    childrenByParent[parentKey] = [
      { id: 'all', label: `All ${p.name}`, rawId: null },
    ];
  });

  // 3. Attach sub-categories to their parents
  subs.forEach((c) => {
    const parentKey = `p-${c.parent_id}`;
    if (childrenByParent[parentKey]) {
      childrenByParent[parentKey].push({
        id: `c-${c.id}`,
        label: c.name,
        rawId: c.id,
      });
    }
  });

  return { parents, childrenByParent };
}

export function price(value, currency = 'ZAR') {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Price unavailable';

  let symbol = 'R';
  if (currency === 'USD') symbol = '$';
  if (currency === 'GBP') symbol = '£';

  return `${symbol} ${number.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
export function applyFilters(products, query, condition, validCategoryNames) {
  const q = String(query || '').trim().toLowerCase();

  return products.filter((product) => {
    // 1. Search query
    if (q.length > 0) {
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

    // 2. Condition
    if (condition !== 'all' && product.condition !== condition) {
      return false;
    }

    // 3. Category
    if (validCategoryNames && validCategoryNames.length > 0) {
      if (!validCategoryNames.includes(product.category_name)) {
        return false;
      }
    }

    return true;
  });
}
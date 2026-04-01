// CamperDNA Product Renderer
// Reads /assets/data/products.json and renders product cards into any container
// with data-category attribute.
//
// Layouts (set via data-layout on the container):
//   "featured"  — 2-column large cards with image, full description, notes (default)
//   "standard"  — 3-column medium cards
//   "list"      — compact single-row items for browsing 7+ products
//
// Usage: <div id="kit-bike-racks" data-category="bike-racks" data-layout="featured" data-max-items="4"></div>

class ProductRenderer {
  constructor(jsonPath = '/assets/data/products.json') {
    this.jsonPath = jsonPath;
    this.data = null;
  }

  async init() {
    try {
      const res = await fetch(this.jsonPath);
      if (!res.ok) throw new Error('products.json not found');
      this.data = await res.json();
    } catch (e) {
      console.warn('ProductRenderer: Failed to load products.json', e);
      this.data = { categories: {} };
    }
  }

  renderCategory(containerId, categoryName, maxItems = 6, layout = 'featured') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = this.data?.categories?.[categoryName];
    if (!items || items.length === 0) return;

    const subset = items.slice(0, maxItems);

    if (layout === 'list') {
      const rows = subset.map(p => this.renderListItem(p)).join('');
      container.innerHTML = `<div class="product-list">${rows}</div>`;
    } else {
      const gridClass = layout === 'standard' ? 'product-grid product-grid--3col' : 'product-grid';
      const cards = subset.map(p => this.renderCard(p)).join('');
      container.innerHTML = `<div class="${gridClass}">${cards}</div>`;
    }
  }

  renderCard(product) {
    const priceHTML = product.price_gbp > 0
      ? `<p class="product-price">Price guide £${product.price_gbp}</p>`
      : '';
    const badgeHTML = product.founder_recommended
      ? `<span class="badge-featured">Founder Pick</span>`
      : '';
    const programmeLabel = { amazon: 'Amazon', direct: 'View product', referral: 'Get a quote' }[product.affiliate_programme] || 'View';

    const imageHTML = product.image_url
      ? `<div class="product-card-image"><img src="${this.esc(product.image_url)}" alt="${this.esc(product.name)}" loading="lazy"></div>`
      : '';

    return `
      <div class="product-card${product.image_url ? ' has-image' : ''}" data-product-id="${this.esc(product.id)}">
        ${badgeHTML ? `<div class="product-card-badge">${badgeHTML}</div>` : ''}
        ${imageHTML}
        <div class="product-card-body">
          <h3 class="product-name">${this.esc(product.name)}</h3>
          <p class="product-description">${this.esc(product.description)}</p>
          ${priceHTML}
          <p class="product-note">${this.esc(product.notes)}</p>
          <a href="${this.esc(product.affiliate_url)}" class="btn-secondary product-link" target="_blank" rel="noopener noreferrer">${programmeLabel} →</a>
        </div>
      </div>`;
  }

  renderListItem(product) {
    const priceHTML = product.price_gbp > 0
      ? `<span class="product-list-price">Price guide £${product.price_gbp}</span>`
      : '';
    const badgeHTML = product.founder_recommended
      ? `<span class="badge-featured badge-featured--small">Founder Pick</span>`
      : '';
    const programmeLabel = { amazon: 'Amazon', direct: 'View product', referral: 'Get a quote' }[product.affiliate_programme] || 'View';

    const imageHTML = product.image_url
      ? `<div class="product-list-image"><img src="${this.esc(product.image_url)}" alt="${this.esc(product.name)}" loading="lazy"></div>`
      : `<div class="product-list-image product-list-image--empty"></div>`;

    return `
      <div class="product-list-item" data-product-id="${this.esc(product.id)}">
        ${imageHTML}
        <div class="product-list-body">
          <div class="product-list-header">
            <h3 class="product-list-name">${this.esc(product.name)}</h3>
            ${badgeHTML}
          </div>
          <p class="product-list-desc">${this.esc(product.description)}</p>
        </div>
        <div class="product-list-action">
          ${priceHTML}
          <a href="${this.esc(product.affiliate_url)}" class="btn-secondary product-link" target="_blank" rel="noopener noreferrer">${programmeLabel} →</a>
        </div>
      </div>`;
  }

  // Safe HTML escape using a temp element
  esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // Find all products matching a tag
  findByTag(tag) {
    const results = [];
    if (!this.data?.categories) return results;
    Object.values(this.data.categories).forEach(items => {
      items.forEach(p => { if (p.tags?.includes(tag)) results.push(p); });
    });
    return results;
  }

  // Render a featured/founder-recommended set across all categories
  renderFeatured(containerId, maxItems = 6) {
    const all = [];
    if (this.data?.categories) {
      Object.values(this.data.categories).forEach(items => {
        items.forEach(p => { if (p.founder_recommended) all.push(p); });
      });
    }
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = all.slice(0, maxItems).map(p => this.renderCard(p)).join('');
    container.innerHTML = `<div class="product-grid">${cards}</div>`;
  }
}

// Auto-init: render all [data-category] containers on page load
document.addEventListener('DOMContentLoaded', async () => {
  const renderer = new ProductRenderer();
  await renderer.init();

  // Render category containers
  // <div id="..." data-category="heating" data-layout="featured" data-max-items="4">
  document.querySelectorAll('[data-category]').forEach(el => {
    const category = el.dataset.category;
    const max = parseInt(el.dataset.maxItems || '6', 10);
    const layout = el.dataset.layout || 'featured';
    renderer.renderCategory(el.id, category, max, layout);
  });

  // Render featured containers: <div id="..." data-products="featured" data-max-items="6">
  document.querySelectorAll('[data-products="featured"]').forEach(el => {
    const max = parseInt(el.dataset.maxItems || '6', 10);
    renderer.renderFeatured(el.id, max);
  });
});

// Export for manual use
window.ProductRenderer = ProductRenderer;

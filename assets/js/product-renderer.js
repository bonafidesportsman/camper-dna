// CamperDNA Product Renderer
// Reads /assets/data/products.json and renders product cards into any container
// with data-category attribute.
//
// Usage: <div id="products-heating" data-category="heating" data-max-items="4"></div>

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

  renderCategory(containerId, categoryName, maxItems = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = this.data?.categories?.[categoryName];
    if (!items || items.length === 0) return;

    const cards = items.slice(0, maxItems).map(p => this.renderCard(p)).join('');
    container.innerHTML = `<div class="product-grid">${cards}</div>`;
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

  // Render category containers: <div id="..." data-category="heating" data-max-items="4">
  document.querySelectorAll('[data-category]').forEach(el => {
    const category = el.dataset.category;
    const max = parseInt(el.dataset.maxItems || '6', 10);
    renderer.renderCategory(el.id, category, max);
  });

  // Render featured containers: <div id="..." data-products="featured" data-max-items="6">
  document.querySelectorAll('[data-products="featured"]').forEach(el => {
    const max = parseInt(el.dataset.maxItems || '6', 10);
    renderer.renderFeatured(el.id, max);
  });
});

// Export for manual use
window.ProductRenderer = ProductRenderer;

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

  renderCategory(containerId, categoryName, maxItems = 6, layout = 'featured', offset = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = this.data?.categories?.[categoryName];
    if (!items || items.length === 0) return;

    const subset = items.slice(offset, offset + maxItems);
    if (subset.length === 0) { container.remove(); return; }

    if (layout === 'list') {
      const rows = subset.map(p => this.renderListItem(p, categoryName)).join('');
      container.innerHTML = `<div class="product-list">${rows}</div>`;
    } else {
      const gridClass = layout === 'standard' ? 'product-grid product-grid--3col' : 'product-grid';
      const cards = subset.map(p => this.renderCard(p, categoryName)).join('');
      container.innerHTML = `<div class="${gridClass}">${cards}</div>`;
    }

    this.trackViewItemList(categoryName, subset);
  }

  // Fire a GA4 view_item_list event so kit/gear category exposure can be
  // compared against affiliate_click to build a real conversion funnel.
  trackViewItemList(listName, items) {
    if (typeof gtag !== 'function' || !items || items.length === 0) return;
    gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: items.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: listName,
        affiliation: p.affiliate_programme,
      })),
    });
  }

  // Extract capacity label from tags (e.g. "2-bike" → "2 bikes")
  capacityLabel(product) {
    if (!product.tags) return '';
    const cap = product.tags.find(t => /^\d-bike$/.test(t));
    if (cap) {
      const n = cap.charAt(0);
      return n === '1' ? '1 bike' : `${n} bikes`;
    }
    if (product.tags.includes('e-bike')) return 'e-bike';
    if (product.tags.includes('extension')) return 'extension';
    return '';
  }

  renderCard(product, categoryName = '') {
    const priceHTML = product.price_gbp > 0
      ? `<p class="product-price">Price guide £${product.price_gbp}</p>`
      : '';
    const badgeHTML = product.founder_recommended
      ? `<span class="badge-featured">Road Tested</span>`
      : '';
    const programmeLabel = { amazon: 'View product', direct: 'View product', referral: 'Get a quote' }[product.affiliate_programme] || 'View product';
    const capacity = this.capacityLabel(product);
    const ribbonHTML = capacity ? `<span class="product-ribbon">${this.esc(capacity)}</span>` : '';

    const imageHTML = product.image_url
      ? `<div class="product-card-image"><img src="${this.esc(product.image_url)}" alt="${this.esc(product.name)}" loading="lazy"></div>`
      : '';

    return `
      <div class="product-card${product.image_url ? ' has-image' : ''}" data-product-id="${this.esc(product.id)}">
        ${ribbonHTML}
        ${badgeHTML ? `<div class="product-card-badge">${badgeHTML}</div>` : ''}
        ${imageHTML}
        <div class="product-card-body">
          <h3 class="product-name">${this.esc(product.name)}</h3>
          <p class="product-description">${this.esc(product.description)}</p>
          ${priceHTML}
          <p class="product-note">${this.esc(product.notes)}</p>
          <a href="${this.esc(product.affiliate_url)}" class="btn-secondary product-link" target="_blank" rel="sponsored noopener noreferrer" data-item-id="${this.esc(product.id)}" data-item-name="${this.esc(product.name)}" data-item-category="${this.esc(categoryName)}" data-affiliate-network="${this.esc(product.affiliate_programme || '')}">${programmeLabel}&nbsp;→</a>
        </div>
      </div>`;
  }

  renderListItem(product, categoryName = '') {
    const priceHTML = product.price_gbp > 0
      ? `<span class="product-list-price">Price guide £${product.price_gbp}</span>`
      : '';
    const badgeHTML = product.founder_recommended
      ? `<span class="badge-featured badge-featured--small">Road Tested</span>`
      : '';
    const programmeLabel = { amazon: 'View', direct: 'View', referral: 'Quote' }[product.affiliate_programme] || 'View';
    const capacity = this.capacityLabel(product);
    const capPillHTML = capacity ? `<span class="product-cap-pill">${this.esc(capacity)}</span>` : '';

    const imageHTML = product.image_url
      ? `<div class="product-list-image"><img src="${this.esc(product.image_url)}" alt="${this.esc(product.name)}" loading="lazy"></div>`
      : '';

    return `
      <div class="product-list-item" data-product-id="${this.esc(product.id)}">
        ${imageHTML}
        <div class="product-list-body">
          <div class="product-list-header">
            <h3 class="product-list-name">${this.esc(product.name)}</h3>
            ${capPillHTML}
            ${badgeHTML}
          </div>
          <p class="product-list-desc">${this.esc(product.description)}</p>
        </div>
        <div class="product-list-action">
          ${priceHTML}
          <a href="${this.esc(product.affiliate_url)}" class="btn-secondary product-link" target="_blank" rel="sponsored noopener noreferrer" data-item-id="${this.esc(product.id)}" data-item-name="${this.esc(product.name)}" data-item-category="${this.esc(categoryName)}" data-affiliate-network="${this.esc(product.affiliate_programme || '')}">${programmeLabel}&nbsp;→</a>
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
      Object.entries(this.data.categories).forEach(([categoryName, items]) => {
        items.forEach(p => { if (p.founder_recommended) all.push({ product: p, categoryName }); });
      });
    }
    const container = document.getElementById(containerId);
    if (!container) return;
    const subset = all.slice(0, maxItems);
    const cards = subset.map(({ product, categoryName }) => this.renderCard(product, categoryName)).join('');
    container.innerHTML = `<div class="product-grid">${cards}</div>`;
    this.trackViewItemList('featured', subset.map(({ product }) => product));
  }
}

// Track affiliate clicks as a GA4 Key Event. Delegated on document so it
// covers every rendered card/list-item regardless of when it was inserted.
// item_id/item_name/item_category/affiliate_network come from data attrs
// set in renderCard/renderListItem — this is the click-side counterpart to
// the view_item_list events fired on render, letting the two be joined into
// a category → product → click funnel in GA4 Explore.
document.addEventListener('click', (event) => {
  const link = event.target.closest('.product-link');
  if (!link || typeof gtag !== 'function') return;
  gtag('event', 'affiliate_click', {
    item_id: link.dataset.itemId || '',
    item_name: link.dataset.itemName || '',
    item_category: link.dataset.itemCategory || '',
    affiliate_network: link.dataset.affiliateNetwork || '',
    link_url: link.href,
  });
});

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
    const offset = parseInt(el.dataset.offset || '0', 10);
    renderer.renderCategory(el.id, category, max, layout, offset);
  });

  // Render featured containers: <div id="..." data-products="featured" data-max-items="6">
  document.querySelectorAll('[data-products="featured"]').forEach(el => {
    const max = parseInt(el.dataset.maxItems || '6', 10);
    renderer.renderFeatured(el.id, max);
  });

  // Affiliate disclosure: automatically insert once per page, directly above
  // the first rendered product section. Skipped if the page already carries
  // its own .kit-disclaimer (e.g. the kit index).
  if (!document.querySelector('.kit-disclaimer')) {
    const containers = document.querySelectorAll('[data-category], [data-products="featured"]');
    const first = Array.from(containers).find(el => el.innerHTML.trim() !== '');
    if (first) {
      const disclosure = document.createElement('div');
      disclosure.className = 'kit-disclaimer kit-disclaimer--auto';
      disclosure.innerHTML = '<p>The product links below are affiliate links — if you buy or get a quote through them, CamperDNA earns a small commission at no extra cost to you. It’s how we keep the guides free. We only list things we’d recommend regardless.</p>';
      first.parentNode.insertBefore(disclosure, first);
    }
  }
});

// Export for manual use
window.ProductRenderer = ProductRenderer;

/**
 * Sipwise Theme — Owala-Style Product Swatch Buy Box Interaction Engine
 * Features:
 * - Dynamic full-section pastel background color transition on hover & commit
 * - Dynamic Add to Cart button background color matching the active swatch
 * - Live color title update
 * - Multi-option Size capsule switching
 * - Smooth image transition & carousel dots
 * - AJAX cart integration & zero layout shift
 */

(function () {
  'use strict';

  // Helper to generate soft pastel background from any hex color
  function hexToPastel(hex) {
    if (!hex || hex === 'transparent') return '#dce4f7';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return '#dce4f7';

    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    // Convert RGB to HSL
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    // Force pastel lightness (88-93%) and comfortable saturation (45-65%)
    const pastelL = 0.90;
    const pastelS = Math.min(Math.max(s, 0.35), 0.65);

    // Convert HSL back to RGB
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    const q = pastelL < 0.5 ? pastelL * (1 + pastelS) : pastelL + pastelS - pastelL * pastelS;
    const p = 2 * pastelL - q;
    const rOut = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const gOut = Math.round(hue2rgb(p, q, h) * 255);
    const bOut = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return `rgb(${rOut}, ${gOut}, ${bOut})`;
  }

  class SwatchBuyBox {
    constructor(container) {
      this.container = container;
      this.sectionId = container.dataset.sectionId;
      this.imageWrap = container.querySelector('.swatch-buybox-image-wrap');
      this.colorTitle = container.querySelector('.swatch-buybox-color-title');
      this.priceCurrent = container.querySelector('.swatch-buybox-price-current');
      this.form = container.querySelector('.swatch-buybox-form');
      this.variantIdInput = container.querySelector('input[name="id"]');
      this.atcBtn = container.querySelector('.swatch-buybox-atc-btn');
      this.atcText = container.querySelector('.swatch-buybox-atc-text');
      this.errorMsg = container.querySelector('.swatch-buybox-error-message');
      this.qtyInput = container.querySelector('.swatch-buybox-qty-input');
      this.qtyMinus = container.querySelector('[data-qty-minus]');
      this.qtyPlus = container.querySelector('[data-qty-plus]');
      this.swatches = Array.from(container.querySelectorAll('.swatch-buybox-swatch'));
      this.sizeBtns = Array.from(container.querySelectorAll('.swatch-buybox-size-btn'));
      this.navDots = Array.from(container.querySelectorAll('.swatch-buybox-nav-dot'));
      this.navPrev = container.querySelector('[data-gallery-prev]');
      this.navNext = container.querySelector('[data-gallery-next]');

      // Parse JSON variant data safely
      const variantDataScript = container.querySelector('.swatch-buybox-variants-data');
      this.variantsData = [];
      if (variantDataScript) {
        try {
          this.variantsData = JSON.parse(variantDataScript.textContent || '[]');
        } catch (e) {
          console.warn('Could not parse variants data:', e);
        }
      }

      this.hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      // Active state initialization
      const initialActiveSwatch =
        this.swatches.find((s) => s.classList.contains('is-active') || s.getAttribute('aria-pressed') === 'true') ||
        this.swatches[0];

      this.selectedSwatch = initialActiveSwatch || null;
      this.selectedVariantId = this.selectedSwatch
        ? this.selectedSwatch.dataset.variantId
        : this.variantIdInput
        ? this.variantIdInput.value
        : '';
      this.selectedColorName = this.selectedSwatch ? this.selectedSwatch.dataset.colorName : '';
      this.selectedColorHex = this.selectedSwatch ? this.selectedSwatch.dataset.colorHex || '#0ea5e9' : '#0ea5e9';
      this.selectedBgColor = this.selectedSwatch ? (this.selectedSwatch.dataset.bgColor || hexToPastel(this.selectedColorHex)) : '#dce4f7';
      this.selectedBtnColor = this.selectedSwatch ? (this.selectedSwatch.dataset.btnColor || this.selectedColorHex) : '#9bb1e4';
      this.selectedSize = this.getActiveSizeValue();

      this.init();
    }

    init() {
      this.bindSwatches();
      this.bindSizes();
      this.bindGalleryNav();
      this.bindQuantity();
      this.bindForm();
      this.bindMediaMatch();

      // Apply initial full-section dynamic background & button color
      this.applyColors(this.selectedBgColor, this.selectedBtnColor);
    }

    bindMediaMatch() {
      const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      const handler = (e) => {
        this.hasHover = e.matches;
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handler);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handler);
      }
    }

    getActiveSizeValue() {
      const activeBtn = this.sizeBtns.find((b) => b.classList.contains('is-active'));
      return activeBtn ? activeBtn.dataset.optionValue : null;
    }

    applyColors(bgColor, btnColor) {
      if (this.container) {
        this.container.style.setProperty('--sbb-active-bg', bgColor);
        this.container.style.setProperty('--sbb-active-btn', btnColor);
      }
    }

    /* ==========================================================================
       SWATCH HOVER PREVIEW & COMMIT
       ========================================================================== */

    bindSwatches() {
      if (!this.swatches.length) return;

      this.swatches.forEach((swatch, index) => {
        // Desktop Hover
        swatch.addEventListener('mouseenter', () => {
          if (!this.hasHover) return;
          this.previewColor(swatch);
        });

        // Desktop Leave
        swatch.addEventListener('mouseleave', () => {
          if (!this.hasHover) return;
          this.revertPreview();
        });

        // Click / Touch Tap
        swatch.addEventListener('click', (e) => {
          e.preventDefault();
          this.commitSelection(swatch);
        });

        // Keyboard Access
        swatch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.commitSelection(swatch);
          }
        });

        swatch.addEventListener('focus', () => {
          if (!this.hasHover) return;
          this.previewColor(swatch);
        });

        swatch.addEventListener('blur', () => {
          if (!this.hasHover) return;
          this.revertPreview();
        });
      });
    }

    previewColor(swatch) {
      if (!swatch) return;
      const colorHex = swatch.dataset.colorHex || '#0ea5e9';
      const colorName = swatch.dataset.colorName || '';
      const previewBg = swatch.dataset.bgColor || hexToPastel(colorHex);
      const previewBtn = swatch.dataset.btnColor || colorHex;
      const previewVariantId = swatch.dataset.variantId;

      // 1. Transition whole section background & ATC button color
      this.applyColors(previewBg, previewBtn);

      // 2. Update color title
      if (this.colorTitle && colorName) {
        this.colorTitle.textContent = colorName;
      }

      // 3. Preview bottle image
      this.swapStageImage(previewVariantId);
    }

    revertPreview() {
      if (!this.selectedSwatch) return;

      // 1. Restore section background & button color to committed state
      this.applyColors(this.selectedBgColor, this.selectedBtnColor);

      // 2. Restore color title
      if (this.colorTitle && this.selectedColorName) {
        this.colorTitle.textContent = this.selectedColorName;
      }

      // 3. Restore bottle image
      this.swapStageImage(this.selectedVariantId);
    }

    commitSelection(swatch) {
      if (!swatch) return;

      const newVariantId = swatch.dataset.variantId;
      const newColorName = swatch.dataset.colorName || '';
      const newColorHex = swatch.dataset.colorHex || '#0ea5e9';
      const newBgColor = swatch.dataset.bgColor || hexToPastel(newColorHex);
      const newBtnColor = swatch.dataset.btnColor || newColorHex;

      this.selectedSwatch = swatch;
      this.selectedVariantId = newVariantId;
      this.selectedColorName = newColorName;
      this.selectedColorHex = newColorHex;
      this.selectedBgColor = newBgColor;
      this.selectedBtnColor = newBtnColor;

      // Update swatch active state & rings
      this.swatches.forEach((s) => {
        const isCurrent = s === swatch;
        s.classList.toggle('is-active', isCurrent);
        s.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });

      // Update color title
      if (this.colorTitle && newColorName) {
        this.colorTitle.textContent = newColorName;
      }

      // Commit background & button colors
      this.applyColors(newBgColor, newBtnColor);
      this.swapStageImage(newVariantId);

      // Multi-option size matching
      const matchedVariant = this.findMatchingVariant(newColorName, this.selectedSize);
      if (matchedVariant) {
        this.selectedVariantId = String(matchedVariant.id);
        this.updateVariantData(matchedVariant);
      } else {
        this.updateVariantDataFromSwatch(swatch);
      }

      // Update URL query param without reload
      this.updateUrlVariant(this.selectedVariantId);
      this.hideError();

      // Dispatch custom event
      this.container.dispatchEvent(
        new CustomEvent('swatch:variant-change', {
          bubbles: true,
          detail: {
            variantId: this.selectedVariantId,
            colorName: newColorName,
            colorHex: newColorHex,
          },
        })
      );
    }

    /* ==========================================================================
       SIZE CAPSULE CONTROLS
       ========================================================================== */

    bindSizes() {
      if (!this.sizeBtns.length) return;

      this.sizeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.sizeBtns.forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');

          this.selectedSize = btn.dataset.optionValue;

          const matchedVariant = this.findMatchingVariant(this.selectedColorName, this.selectedSize);
          if (matchedVariant) {
            this.selectedVariantId = String(matchedVariant.id);
            this.updateVariantData(matchedVariant);
            this.updateUrlVariant(this.selectedVariantId);
          }
        });
      });
    }

    findMatchingVariant(colorValue, sizeValue) {
      if (!this.variantsData || !this.variantsData.length) return null;

      return (
        this.variantsData.find((v) => {
          const options = v.options || [];
          const matchesColor =
            !colorValue || options.some((opt) => String(opt).toLowerCase().trim() === String(colorValue).toLowerCase().trim());
          const matchesSize =
            !sizeValue || options.some((opt) => String(opt).toLowerCase().trim() === String(sizeValue).toLowerCase().trim());
          return matchesColor && matchesSize;
        }) || this.variantsData.find((v) => String(v.id) === String(this.selectedVariantId))
      );
    }

    /* ==========================================================================
       GALLERY CAROUSEL NAV (< ● ○ ○ ○ >)
       ========================================================================== */

    bindGalleryNav() {
      if (this.navDots.length) {
        this.navDots.forEach((dot, idx) => {
          dot.addEventListener('click', (e) => {
            e.preventDefault();
            this.navDots.forEach((d) => d.classList.remove('is-active'));
            dot.classList.add('is-active');
          });
        });
      }

      if (this.navPrev) {
        this.navPrev.addEventListener('click', (e) => {
          e.preventDefault();
          const currentIdx = this.swatches.indexOf(this.selectedSwatch);
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : this.swatches.length - 1;
          if (this.swatches[prevIdx]) this.commitSelection(this.swatches[prevIdx]);
        });
      }

      if (this.navNext) {
        this.navNext.addEventListener('click', (e) => {
          e.preventDefault();
          const currentIdx = this.swatches.indexOf(this.selectedSwatch);
          const nextIdx = currentIdx < this.swatches.length - 1 ? currentIdx + 1 : 0;
          if (this.swatches[nextIdx]) this.commitSelection(this.swatches[nextIdx]);
        });
      }
    }

    swapStageImage(variantId) {
      if (!this.imageWrap) return;

      const allImages = this.imageWrap.querySelectorAll('.swatch-buybox-img');
      if (!allImages.length) return;

      let targetImg = this.imageWrap.querySelector(`[data-variant-id="${variantId}"]`);
      if (!targetImg) {
        targetImg = allImages[0];
      }

      allImages.forEach((img) => {
        if (img === targetImg) {
          img.classList.remove('is-inactive');
          img.classList.add('is-active');
        } else {
          img.classList.remove('is-active');
          img.classList.add('is-inactive');
        }
      });
    }

    updateVariantData(variant) {
      if (!variant) return;

      if (this.variantIdInput) {
        this.variantIdInput.value = variant.id;
      }

      if (this.priceCurrent) {
        this.priceCurrent.textContent = this.formatMoney(variant.price);
      }

      this.updateAvailability(variant.available);
    }

    updateVariantDataFromSwatch(swatch) {
      const variantId = swatch.dataset.variantId;
      const price = swatch.dataset.price;
      const isAvailable = swatch.dataset.available === 'true';

      if (this.variantIdInput && variantId) {
        this.variantIdInput.value = variantId;
      }

      if (this.priceCurrent && price) {
        this.priceCurrent.textContent = price;
      }

      this.updateAvailability(isAvailable);
    }

    updateAvailability(isAvailable) {
      if (!this.atcBtn) return;

      if (isAvailable) {
        this.atcBtn.removeAttribute('disabled');
        if (this.atcText) {
          this.atcText.textContent = this.atcBtn.dataset.defaultText || 'Add to cart';
        }
      } else {
        this.atcBtn.setAttribute('disabled', 'disabled');
        if (this.atcText) {
          this.atcText.textContent = 'Sold Out';
        }
      }
    }

    updateUrlVariant(variantId) {
      if (!variantId || !window.history.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variantId);
      window.history.replaceState({ path: url.href }, '', url.href);
    }

    formatMoney(cents) {
      if (window.Shopify && typeof Shopify.formatMoney === 'function') {
        const moneyFormat = this.container.dataset.moneyFormat || '${{amount}}';
        return Shopify.formatMoney(cents, moneyFormat);
      }
      return '$' + (cents / 100).toFixed(2);
    }

    /* ==========================================================================
       QUANTITY & FORM
       ========================================================================== */

    bindQuantity() {
      if (!this.qtyInput) return;

      if (this.qtyMinus) {
        this.qtyMinus.addEventListener('click', (e) => {
          e.preventDefault();
          const val = parseInt(this.qtyInput.value, 10) || 1;
          if (val > 1) this.qtyInput.value = val - 1;
        });
      }

      if (this.qtyPlus) {
        this.qtyPlus.addEventListener('click', (e) => {
          e.preventDefault();
          const val = parseInt(this.qtyInput.value, 10) || 1;
          this.qtyInput.value = val + 1;
        });
      }

      this.qtyInput.addEventListener('change', () => {
        let val = parseInt(this.qtyInput.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        this.qtyInput.value = val;
      });
    }

    bindForm() {
      if (!this.form) return;

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddToCart();
      });
    }

    handleAddToCart() {
      if (!this.atcBtn || this.atcBtn.hasAttribute('disabled')) return;

      const variantId = this.variantIdInput ? this.variantIdInput.value : this.selectedVariantId;
      const quantity = this.qtyInput ? parseInt(this.qtyInput.value, 10) || 1 : 1;

      if (!variantId) {
        this.showError('Please select a variant option.');
        return;
      }

      this.atcBtn.classList.add('is-loading');
      this.atcBtn.setAttribute('disabled', 'disabled');
      this.hideError();

      const payload = {
        items: [{ id: parseInt(variantId, 10), quantity: quantity }],
        sections: ['cart-drawer', 'cart-icon-bubble'],
      };

      const cartAddUrl = (window.routes && window.routes.cart_add_url) || '/cart/add.js';

      fetch(cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((err) => {
              throw err;
            });
          }
          return res.json();
        })
        .then((data) => {
          this.atcBtn.classList.remove('is-loading');
          this.atcBtn.classList.add('is-success');
          if (this.atcText) this.atcText.textContent = 'Added ✓';

          // Trigger Cart Drawer / Notification
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer) {
            if (typeof cartDrawer.renderContents === 'function') {
              cartDrawer.renderContents(data);
            } else if (typeof cartDrawer.open === 'function') {
              cartDrawer.open();
            } else {
              cartDrawer.classList.add('active');
            }
          }

          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { cart: data } }));

          setTimeout(() => {
            this.atcBtn.classList.remove('is-success');
            this.atcBtn.removeAttribute('disabled');
            if (this.atcText) {
              this.atcText.textContent = this.atcBtn.dataset.defaultText || 'Add to cart';
            }
          }, 2000);
        })
        .catch((err) => {
          console.error('Cart add error:', err);
          this.atcBtn.classList.remove('is-loading');
          this.atcBtn.removeAttribute('disabled');
          const message = (err && (err.description || err.message)) || 'Could not add to cart. Please try again.';
          this.showError(message);
        });
    }

    showError(msg) {
      if (!this.errorMsg) return;
      this.errorMsg.textContent = msg;
      this.errorMsg.removeAttribute('hidden');
    }

    hideError() {
      if (!this.errorMsg) return;
      this.errorMsg.textContent = '';
      this.errorMsg.setAttribute('hidden', '');
    }
  }

  function initSwatchBuyBoxes() {
    document.querySelectorAll('[data-swatch-buybox]').forEach((el) => {
      if (!el.__swatchBuyBoxInstance) {
        el.__swatchBuyBoxInstance = new SwatchBuyBox(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwatchBuyBoxes);
  } else {
    initSwatchBuyBoxes();
  }

  document.addEventListener('shopify:section:load', (e) => {
    const sectionEl = e.target.querySelector('[data-swatch-buybox]');
    if (sectionEl) {
      sectionEl.__swatchBuyBoxInstance = new SwatchBuyBox(sectionEl);
    }
  });

  window.SwatchBuyBox = SwatchBuyBox;
})();

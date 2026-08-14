/**
 * Sipwise Theme — Product Swatch Buy Box Interaction Engine
 * Vanilla ES6, No Framework Dependencies
 * Lighthouse & Accessibility Optimized
 */

(function () {
  'use strict';

  class SwatchBuyBox {
    constructor(container) {
      this.container = container;
      this.sectionId = container.dataset.sectionId;
      this.stage = container.querySelector('.swatch-buybox-stage');
      this.imageWrap = container.querySelector('.swatch-buybox-image-wrap');
      this.colorLabel = container.querySelector('.swatch-buybox-color-name');
      this.priceCurrent = container.querySelector('.swatch-buybox-price-current');
      this.priceCompare = container.querySelector('.swatch-buybox-price-compare');
      this.priceDiscount = container.querySelector('.swatch-buybox-price-discount');
      this.stockStatus = container.querySelector('.swatch-buybox-stock-status');
      this.form = container.querySelector('.swatch-buybox-form');
      this.variantIdInput = container.querySelector('input[name="id"]');
      this.atcBtn = container.querySelector('.swatch-buybox-atc-btn');
      this.atcText = container.querySelector('.swatch-buybox-atc-text');
      this.errorMsg = container.querySelector('.swatch-buybox-error-message');
      this.qtyInput = container.querySelector('.swatch-buybox-qty-input');
      this.qtyMinus = container.querySelector('[data-qty-minus]');
      this.qtyPlus = container.querySelector('[data-qty-plus]');
      this.swatches = Array.from(container.querySelectorAll('.swatch-buybox-swatch'));
      this.pills = Array.from(container.querySelectorAll('.swatch-buybox-pill'));

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

      // Check device hover capability (touch vs mouse)
      this.hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      // Track active selected state
      const initialActiveSwatch = this.swatches.find(
        (s) => s.classList.contains('is-active') || s.getAttribute('aria-pressed') === 'true'
      ) || this.swatches[0];

      this.selectedSwatch = initialActiveSwatch || null;
      this.selectedVariantId = this.selectedSwatch ? this.selectedSwatch.dataset.variantId : (this.variantIdInput ? this.variantIdInput.value : '');
      this.selectedColorName = this.selectedSwatch ? this.selectedSwatch.dataset.colorName : '';
      this.selectedColorHex = this.selectedSwatch ? (this.selectedSwatch.dataset.colorHex || '#0f172a') : '#0f172a';
      this.selectedSecondaryOption = this.getActivePillValue();

      this.init();
    }

    init() {
      this.bindSwatches();
      this.bindPills();
      this.bindQuantity();
      this.bindForm();
      this.bindMediaMatch();

      // Apply initial color CSS variables to stage
      if (this.selectedColorHex && this.stage) {
        this.updateStageVisuals(this.selectedColorHex);
      }
    }

    bindMediaMatch() {
      const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      const updateHoverState = (e) => {
        this.hasHover = e.matches;
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', updateHoverState);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(updateHoverState);
      }
    }

    getActivePillValue() {
      const activePill = this.pills.find((p) => p.classList.contains('is-active'));
      return activePill ? activePill.dataset.optionValue : null;
    }

    /* ==========================================================================
       SWATCH HOVER PREVIEW & COMMIT SELECTION
       ========================================================================== */

    bindSwatches() {
      if (!this.swatches.length) return;

      this.swatches.forEach((swatch) => {
        // Desktop Hover Preview (Only if true hover support)
        swatch.addEventListener('mouseenter', () => {
          if (!this.hasHover) return;
          this.previewColor(swatch);
        });

        // Desktop Mouse Leave (Revert to currently committed variant)
        swatch.addEventListener('mouseleave', () => {
          if (!this.hasHover) return;
          this.revertPreview();
        });

        // Click / Touch Tap Commit Selection
        swatch.addEventListener('click', (e) => {
          e.preventDefault();
          this.commitSelection(swatch);
        });

        // Keyboard Access (Enter / Space)
        swatch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.commitSelection(swatch);
          }
        });

        // Keyboard Focus Preview
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

    /**
     * Preview color on hover — VISUAL ONLY, no side effects
     * Does NOT update variant.id, URL, price, or cart form
     */
    previewColor(swatch) {
      if (!swatch) return;
      const colorHex = swatch.dataset.colorHex || '#0f172a';
      const colorName = swatch.dataset.colorName || '';
      const previewImgId = swatch.dataset.variantId;

      // Update Color Name Label
      if (this.colorLabel && colorName) {
        this.colorLabel.textContent = colorName;
      }

      // Update Stage Background & Glow
      this.updateStageVisuals(colorHex);

      // Preview Variant Image (if matching image element exists)
      this.swapStageImage(previewImgId);
    }

    /**
     * Revert to currently selected variant — Never snaps back to default #1
     */
    revertPreview() {
      if (!this.selectedSwatch) return;

      // Restore Selected Color Name Label
      if (this.colorLabel && this.selectedColorName) {
        this.colorLabel.textContent = this.selectedColorName;
      }

      // Restore Selected Color Visuals
      this.updateStageVisuals(this.selectedColorHex);

      // Restore Selected Variant Image
      this.swapStageImage(this.selectedVariantId);
    }

    /**
     * Commit selection on click / tap — Updates variant state, URL, price, form
     */
    commitSelection(swatch) {
      if (!swatch) return;

      const newVariantId = swatch.dataset.variantId;
      const newColorName = swatch.dataset.colorName || '';
      const newColorHex = swatch.dataset.colorHex || '#0f172a';

      this.selectedSwatch = swatch;
      this.selectedVariantId = newVariantId;
      this.selectedColorName = newColorName;
      this.selectedColorHex = newColorHex;

      // Update Swatch Active Rings & ARIA Attributes
      this.swatches.forEach((s) => {
        const isCurrent = s === swatch;
        s.classList.toggle('is-active', isCurrent);
        s.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });

      // Update Color Label
      if (this.colorLabel && newColorName) {
        this.colorLabel.textContent = newColorName;
      }

      // Commit Stage Visuals
      this.updateStageVisuals(newColorHex);
      this.swapStageImage(newVariantId);

      // If multi-options exist (e.g. Color + Size), resolve matched variant object
      const matchedVariant = this.findMatchingVariant(newColorName, this.selectedSecondaryOption);

      if (matchedVariant) {
        this.selectedVariantId = String(matchedVariant.id);
        this.updateVariantData(matchedVariant);
      } else {
        // Fall back to swatch's direct data attributes
        this.updateVariantDataFromSwatch(swatch);
      }

      // Update URL without full page reload
      this.updateUrlVariant(this.selectedVariantId);

      // Clear any previous error banner
      this.hideError();

      // Dispatch Custom Event for external apps/analytics
      this.container.dispatchEvent(
        new CustomEvent('swatch:variant-change', {
          bubbles: true,
          detail: {
            variantId: this.selectedVariantId,
            colorName: newColorName,
            colorHex: newColorHex,
            variant: matchedVariant || null,
          },
        })
      );
    }

    /* ==========================================================================
       SECONDARY OPTION PILLS (e.g. SIZE)
       ========================================================================== */

    bindPills() {
      if (!this.pills.length) return;

      this.pills.forEach((pill) => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          this.pills.forEach((p) => {
            p.classList.remove('is-active');
            p.setAttribute('aria-pressed', 'false');
          });
          pill.classList.add('is-active');
          pill.setAttribute('aria-pressed', 'true');

          this.selectedSecondaryOption = pill.dataset.optionValue;

          // Re-evaluate variant with current color + new size
          const matchedVariant = this.findMatchingVariant(
            this.selectedColorName,
            this.selectedSecondaryOption
          );

          if (matchedVariant) {
            this.selectedVariantId = String(matchedVariant.id);
            this.updateVariantData(matchedVariant);
            this.updateUrlVariant(this.selectedVariantId);
          }
        });
      });
    }

    findMatchingVariant(colorValue, secondaryValue) {
      if (!this.variantsData || !this.variantsData.length) return null;

      return this.variantsData.find((v) => {
        const options = v.options || [];
        const matchesColor = !colorValue || options.some(
          (opt) => String(opt).toLowerCase().trim() === String(colorValue).toLowerCase().trim()
        );
        const matchesSecondary = !secondaryValue || options.some(
          (opt) => String(opt).toLowerCase().trim() === String(secondaryValue).toLowerCase().trim()
        );
        return matchesColor && matchesSecondary;
      }) || this.variantsData.find((v) => String(v.id) === String(this.selectedVariantId));
    }

    /* ==========================================================================
       DOM UPDATES & HELPERS
       ========================================================================== */

    updateStageVisuals(hex) {
      if (!this.stage || !hex) return;

      // Single CSS custom property driving ambient glow & accent tint
      this.stage.style.setProperty('--product-swatch-glow', hex + '26'); // ~15% alpha
      this.stage.style.setProperty('--swatch-active-color', hex);

      // Update swatch active ring color variable
      this.container.style.setProperty('--swatch-ring-color', hex);
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

      // Update Hidden Form Variant ID
      if (this.variantIdInput) {
        this.variantIdInput.value = variant.id;
      }

      // Update Pricing
      if (this.priceCurrent) {
        this.priceCurrent.textContent = this.formatMoney(variant.price);
      }

      if (this.priceCompare) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          this.priceCompare.textContent = this.formatMoney(variant.compare_at_price);
          this.priceCompare.removeAttribute('hidden');
        } else {
          this.priceCompare.setAttribute('hidden', '');
        }
      }

      // Update Discount Badge
      if (this.priceDiscount) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          const discountPct = Math.round(
            ((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100
          );
          this.priceDiscount.textContent = `Save ${discountPct}%`;
          this.priceDiscount.removeAttribute('hidden');
        } else {
          this.priceDiscount.setAttribute('hidden', '');
        }
      }

      // Update Availability & ATC Button State
      this.updateAvailability(variant.available);
    }

    updateVariantDataFromSwatch(swatch) {
      const variantId = swatch.dataset.variantId;
      const price = swatch.dataset.price;
      const comparePrice = swatch.dataset.comparePrice;
      const priceRaw = parseInt(swatch.dataset.priceRaw || '0', 10);
      const comparePriceRaw = parseInt(swatch.dataset.comparePriceRaw || '0', 10);
      const isAvailable = swatch.dataset.available === 'true';

      if (this.variantIdInput && variantId) {
        this.variantIdInput.value = variantId;
      }

      if (this.priceCurrent && price) {
        this.priceCurrent.textContent = price;
      }

      if (this.priceCompare) {
        if (comparePriceRaw > priceRaw && comparePrice) {
          this.priceCompare.textContent = comparePrice;
          this.priceCompare.removeAttribute('hidden');
        } else {
          this.priceCompare.setAttribute('hidden', '');
        }
      }

      if (this.priceDiscount) {
        if (comparePriceRaw > priceRaw) {
          const discountPct = Math.round(((comparePriceRaw - priceRaw) / comparePriceRaw) * 100);
          this.priceDiscount.textContent = `Save ${discountPct}%`;
          this.priceDiscount.removeAttribute('hidden');
        } else {
          this.priceDiscount.setAttribute('hidden', '');
        }
      }

      this.updateAvailability(isAvailable);
    }

    updateAvailability(isAvailable) {
      if (!this.atcBtn) return;

      if (isAvailable) {
        this.atcBtn.removeAttribute('disabled');
        if (this.atcText) {
          this.atcText.textContent = this.atcBtn.dataset.defaultText || 'Add to Cart';
        }

        if (this.stockStatus) {
          this.stockStatus.className = 'swatch-buybox-stock-status';
          this.stockStatus.innerHTML = '<span class="swatch-buybox-stock-dot"></span> In Stock — Ready to Ship';
        }
      } else {
        this.atcBtn.setAttribute('disabled', 'disabled');
        if (this.atcText) {
          this.atcText.textContent = 'Sold Out';
        }

        if (this.stockStatus) {
          this.stockStatus.className = 'swatch-buybox-stock-status swatch-buybox-stock-status--out';
          this.stockStatus.innerHTML = '<span class="swatch-buybox-stock-dot"></span> Out of Stock';
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
       QUANTITY SELECTOR
       ========================================================================== */

    bindQuantity() {
      if (!this.qtyInput) return;

      if (this.qtyMinus) {
        this.qtyMinus.addEventListener('click', (e) => {
          e.preventDefault();
          const currentVal = parseInt(this.qtyInput.value, 10) || 1;
          if (currentVal > 1) {
            this.qtyInput.value = currentVal - 1;
          }
        });
      }

      if (this.qtyPlus) {
        this.qtyPlus.addEventListener('click', (e) => {
          e.preventDefault();
          const currentVal = parseInt(this.qtyInput.value, 10) || 1;
          this.qtyInput.value = currentVal + 1;
        });
      }

      this.qtyInput.addEventListener('change', () => {
        let val = parseInt(this.qtyInput.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        this.qtyInput.value = val;
      });
    }

    /* ==========================================================================
       AJAX ADD TO CART & THEME DRAWER INTEGRATION
       ========================================================================== */

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

      // Enter Loading State
      this.atcBtn.classList.add('is-loading');
      this.atcBtn.setAttribute('disabled', 'disabled');
      this.hideError();

      const payload = {
        items: [
          {
            id: parseInt(variantId, 10),
            quantity: quantity,
          },
        ],
        sections: ['cart-drawer', 'cart-icon-bubble'],
      };

      const cartAddUrl = (window.routes && window.routes.cart_add_url) || '/cart/add.js';

      fetch(cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((errData) => {
              throw errData;
            });
          }
          return res.json();
        })
        .then((data) => {
          // Success Feedback
          this.atcBtn.classList.remove('is-loading');
          this.atcBtn.classList.add('is-success');
          if (this.atcText) this.atcText.textContent = 'Added ✓';

          // Trigger Shrine/Shopify Theme Cart Drawer or Cart Notification
          this.triggerCartDrawer(data);

          // Restore Button After 2 Seconds
          setTimeout(() => {
            this.atcBtn.classList.remove('is-success');
            this.atcBtn.removeAttribute('disabled');
            if (this.atcText) {
              this.atcText.textContent = this.atcBtn.dataset.defaultText || 'Add to Cart';
            }
          }, 2000);
        })
        .catch((err) => {
          console.error('Cart add error:', err);
          this.atcBtn.classList.remove('is-loading');
          this.atcBtn.removeAttribute('disabled');

          const message =
            (err && (err.description || err.message)) ||
            'Could not add item to cart. Please try again.';
          this.showError(message);
        });
    }

    triggerCartDrawer(data) {
      // 1. Check for Shrine / Dawn standard <cart-drawer> element
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

      // 2. Check for cart notification element
      const cartNotification = document.querySelector('cart-notification');
      if (cartNotification && typeof cartNotification.renderContents === 'function') {
        cartNotification.renderContents(data);
      }

      // 3. Dispatch global custom events for standard listeners
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
      document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { cart: data } }));
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

  // Initialize all instances on page
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

  // Support Shopify Theme Editor dynamic re-renders
  document.addEventListener('shopify:section:load', (e) => {
    const sectionEl = e.target.querySelector('[data-swatch-buybox]');
    if (sectionEl) {
      sectionEl.__swatchBuyBoxInstance = new SwatchBuyBox(sectionEl);
    }
  });

  window.SwatchBuyBox = SwatchBuyBox;
})();

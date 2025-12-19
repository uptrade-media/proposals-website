-- Migration: 0038_ecommerce_module.sql
-- Ecommerce Module - Shopify integration with multi-tenant support
-- Phase 1: Store connections and foundation

-- =====================================================
-- SHOPIFY STORES - Multi-tenant store connections
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Store identification
  shop_domain TEXT NOT NULL,              -- 'mystore.myshopify.com'
  store_name TEXT,                        -- Display name
  
  -- Authentication (encrypted at rest via Supabase)
  access_token TEXT NOT NULL,             -- Admin API access token
  scopes TEXT[],                          -- Granted scopes
  
  -- Store info (cached from API)
  shop_id BIGINT,                         -- Shopify's internal ID
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  plan_name TEXT,                         -- 'basic', 'shopify', 'advanced'
  shop_owner TEXT,
  email TEXT,
  
  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,                  -- 'success', 'error', 'in_progress'
  last_sync_error TEXT,
  products_count INTEGER DEFAULT 0,
  variants_count INTEGER DEFAULT 0,
  orders_count_30d INTEGER DEFAULT 0,
  
  -- Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_hours INTEGER DEFAULT 6,
  low_stock_threshold INTEGER DEFAULT 10,
  
  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES contacts(id),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_shop_per_org UNIQUE (org_id, shop_domain)
);

CREATE INDEX IF NOT EXISTS idx_shopify_stores_org ON shopify_stores(org_id);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_active ON shopify_stores(org_id, is_active);

-- =====================================================
-- SHOPIFY LOCATIONS - Inventory locations
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  
  shopify_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  province TEXT,
  province_code TEXT,
  country TEXT,
  country_code TEXT,
  zip TEXT,
  phone TEXT,
  
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  fulfills_online_orders BOOLEAN DEFAULT true,
  
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_location_per_store UNIQUE (store_id, shopify_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_locations_store ON shopify_locations(store_id);

-- =====================================================
-- SHOPIFY PRODUCTS - Cached product data
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  
  -- Shopify identifiers
  shopify_id BIGINT NOT NULL,
  shopify_handle TEXT,
  
  -- Product info
  title TEXT NOT NULL,
  body_html TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  
  -- Status
  status TEXT DEFAULT 'active',           -- 'active', 'draft', 'archived'
  published_at TIMESTAMPTZ,
  published_scope TEXT,                   -- 'web', 'global'
  
  -- Pricing (from first variant)
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  
  -- Inventory (aggregated)
  total_inventory INTEGER DEFAULT 0,
  inventory_tracked BOOLEAN DEFAULT true,
  
  -- Images
  featured_image_url TEXT,
  featured_image_alt TEXT,
  images JSONB DEFAULT '[]',
  
  -- Variants summary
  variants_count INTEGER DEFAULT 1,
  has_variants BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]',             -- [{name, position, values}]
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_product_per_store UNIQUE (store_id, shopify_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_products_store ON shopify_products(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON shopify_products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_shopify_products_inventory ON shopify_products(store_id, total_inventory);
CREATE INDEX IF NOT EXISTS idx_shopify_products_handle ON shopify_products(store_id, shopify_handle);

-- =====================================================
-- SHOPIFY VARIANTS - Product variants with inventory
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  
  -- Shopify identifiers
  shopify_id BIGINT NOT NULL,
  shopify_product_id BIGINT NOT NULL,
  
  -- Variant info
  title TEXT,                             -- 'Small / Red'
  sku TEXT,
  barcode TEXT,
  
  -- Options
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  
  -- Pricing
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  
  -- Inventory
  inventory_item_id BIGINT,
  inventory_quantity INTEGER DEFAULT 0,
  inventory_policy TEXT DEFAULT 'deny',   -- 'deny' or 'continue'
  inventory_management TEXT,              -- 'shopify' or null
  
  -- Fulfillment
  fulfillment_service TEXT DEFAULT 'manual',
  requires_shipping BOOLEAN DEFAULT true,
  weight DECIMAL(10,2),
  weight_unit TEXT DEFAULT 'lb',
  
  -- Image
  image_id BIGINT,
  image_url TEXT,
  
  -- Position
  position INTEGER DEFAULT 1,
  
  -- Tax
  taxable BOOLEAN DEFAULT true,
  tax_code TEXT,
  
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_variant_per_store UNIQUE (store_id, shopify_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_variants_product ON shopify_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_variants_store ON shopify_variants(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_variants_sku ON shopify_variants(store_id, sku);
CREATE INDEX IF NOT EXISTS idx_shopify_variants_low_stock ON shopify_variants(store_id, inventory_quantity);
CREATE INDEX IF NOT EXISTS idx_shopify_variants_inventory_item ON shopify_variants(inventory_item_id);

-- =====================================================
-- SHOPIFY INVENTORY LEVELS - Per-location inventory
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES shopify_variants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES shopify_locations(id) ON DELETE CASCADE,
  
  inventory_item_id BIGINT NOT NULL,
  shopify_location_id BIGINT NOT NULL,
  
  available INTEGER DEFAULT 0,
  
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_inventory_level UNIQUE (store_id, inventory_item_id, shopify_location_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_inventory_variant ON shopify_inventory_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_inventory_location ON shopify_inventory_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_shopify_inventory_store ON shopify_inventory_levels(store_id);

-- =====================================================
-- SHOPIFY ORDERS - Order history (read-only cache)
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  
  -- Shopify identifiers
  shopify_id BIGINT NOT NULL,
  order_number INTEGER,
  name TEXT,                              -- '#1001'
  
  -- Order status
  financial_status TEXT,                  -- 'paid', 'pending', 'refunded'
  fulfillment_status TEXT,                -- null, 'fulfilled', 'partial'
  
  -- Customer
  customer_email TEXT,
  customer_name TEXT,
  customer_shopify_id BIGINT,
  
  -- Amounts
  subtotal_price DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  total_shipping DECIMAL(10,2),
  total_discounts DECIMAL(10,2),
  total_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Items summary
  line_items_count INTEGER DEFAULT 0,
  line_items JSONB DEFAULT '[]',
  
  -- Shipping
  shipping_address JSONB,
  billing_address JSONB,
  shipping_lines JSONB DEFAULT '[]',
  
  -- Timestamps
  processed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Notes
  note TEXT,
  tags TEXT[],
  
  -- Tracking
  fulfillments JSONB DEFAULT '[]',
  
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_order_per_store UNIQUE (store_id, shopify_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_store ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_date ON shopify_orders(store_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_status ON shopify_orders(store_id, financial_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer ON shopify_orders(store_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_number ON shopify_orders(store_id, order_number);

-- =====================================================
-- SHOPIFY SYNC LOG - Audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL,                -- 'full', 'products', 'orders', 'inventory'
  status TEXT NOT NULL,                   -- 'started', 'completed', 'failed'
  
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  
  error_message TEXT,
  error_details JSONB,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  triggered_by UUID REFERENCES contacts(id),
  trigger_type TEXT DEFAULT 'manual'      -- 'manual', 'scheduled', 'webhook'
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_store ON shopify_sync_log(store_id, started_at DESC);

-- =====================================================
-- Add comments for documentation
-- =====================================================
COMMENT ON TABLE shopify_stores IS 'Connected Shopify stores per organization';
COMMENT ON TABLE shopify_products IS 'Cached Shopify product data';
COMMENT ON TABLE shopify_variants IS 'Product variants with inventory tracking';
COMMENT ON TABLE shopify_orders IS 'Order history (read-only cache)';
COMMENT ON TABLE shopify_locations IS 'Fulfillment/inventory locations';
COMMENT ON TABLE shopify_inventory_levels IS 'Per-location inventory quantities';
COMMENT ON TABLE shopify_sync_log IS 'Sync operation audit trail';

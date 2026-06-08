CREATE TABLE IF NOT EXISTS remote_modules (
  remote_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  route_base_path TEXT NOT NULL CHECK (route_base_path LIKE '/%'),
  scope_class_name TEXT NOT NULL,
  remote_name TEXT NOT NULL,
  required_permissions_json TEXT NOT NULL,
  feature_flags_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remote_releases (
  remote_id TEXT NOT NULL,
  version TEXT NOT NULL,
  r2_prefix TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  min_shell_version TEXT,
  git_sha TEXT NOT NULL,
  built_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'active', 'retired', 'blocked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (remote_id, version),
  FOREIGN KEY (remote_id) REFERENCES remote_modules(remote_id)
);

CREATE TABLE IF NOT EXISTS remote_activations (
  environment TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  active_version TEXT NOT NULL,
  activated_by TEXT NOT NULL,
  activated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (environment, tenant_id, remote_id),
  FOREIGN KEY (remote_id, active_version)
    REFERENCES remote_releases(remote_id, version)
);

CREATE INDEX IF NOT EXISTS idx_remote_releases_status
  ON remote_releases(remote_id, status);

CREATE INDEX IF NOT EXISTS idx_remote_activations_lookup
  ON remote_activations(environment, tenant_id, remote_id);

INSERT INTO remote_modules (
  remote_id,
  display_name,
  route_base_path,
  scope_class_name,
  remote_name,
  required_permissions_json,
  feature_flags_json,
  enabled,
  display_order
)
VALUES
  (
    'product-config',
    'Product Config',
    '/product-config',
    'product-config-remote',
    'product_config',
    '["product-config:view"]',
    NULL,
    1,
    10
  ),
  (
    'underwriting',
    'Underwriting',
    '/underwriting',
    'underwriting-remote',
    'underwriting',
    '["underwriting:view"]',
    NULL,
    1,
    20
  )
ON CONFLICT(remote_id) DO UPDATE SET
  display_name = excluded.display_name,
  route_base_path = excluded.route_base_path,
  scope_class_name = excluded.scope_class_name,
  remote_name = excluded.remote_name,
  required_permissions_json = excluded.required_permissions_json,
  feature_flags_json = excluded.feature_flags_json,
  enabled = excluded.enabled,
  display_order = excluded.display_order,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO remote_releases (
  remote_id,
  version,
  r2_prefix,
  contract_version,
  min_shell_version,
  git_sha,
  built_at,
  status
)
VALUES
  (
    'product-config',
    '2026.06.08-step4',
    'remotes/product-config/releases/2026.06.08-step4',
    1,
    NULL,
    'step4-d1-seed',
    '2026-06-08T00:00:00.000Z',
    'available'
  ),
  (
    'underwriting',
    '2026.06.08-step4',
    'remotes/underwriting/releases/2026.06.08-step4',
    1,
    NULL,
    'step4-d1-seed',
    '2026-06-08T00:00:00.000Z',
    'available'
  )
ON CONFLICT(remote_id, version) DO UPDATE SET
  r2_prefix = excluded.r2_prefix,
  contract_version = excluded.contract_version,
  min_shell_version = excluded.min_shell_version,
  git_sha = excluded.git_sha,
  built_at = excluded.built_at,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO remote_activations (
  environment,
  tenant_id,
  remote_id,
  active_version,
  activated_by,
  activated_at
)
VALUES
  (
    'development',
    'tenant-ginja-ai',
    'product-config',
    '2026.06.08-step4',
    'seed',
    '2026-06-08T00:00:00.000Z'
  ),
  (
    'development',
    'tenant-ginja-ai',
    'underwriting',
    '2026.06.08-step4',
    'seed',
    '2026-06-08T00:00:00.000Z'
  )
ON CONFLICT(environment, tenant_id, remote_id) DO UPDATE SET
  active_version = excluded.active_version,
  activated_by = excluded.activated_by,
  activated_at = excluded.activated_at;

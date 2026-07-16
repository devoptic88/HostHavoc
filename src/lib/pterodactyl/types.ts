// Shapes returned by the Pterodactyl v1 REST APIs.
// Application API objects arrive as { object: string, attributes: T }.

export interface PteroList<T> {
  object: "list";
  data: { object: string; attributes: T }[];
  meta?: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

export interface PteroItem<T> {
  object: string;
  attributes: T;
}

// ─── Application API ────────────────────────────────────────────────────

export interface AppUser {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  root_admin: boolean;
  "2fa": boolean;
  created_at: string;
  updated_at: string;
}

export interface AppServerLimits {
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads: string | null;
}

export interface AppServerFeatureLimits {
  databases: number;
  allocations: number;
  backups: number;
}

export interface AppServer {
  id: number;
  external_id: string | null;
  uuid: string;
  identifier: string;
  name: string;
  description: string;
  status: string | null; // "installing" | "install_failed" | "suspended" | null
  suspended: boolean;
  limits: AppServerLimits;
  feature_limits: AppServerFeatureLimits;
  user: number;
  node: number;
  allocation: number;
  nest: number;
  egg: number;
  created_at: string;
  updated_at: string;
}

export interface AppNode {
  id: number;
  uuid: string;
  public: boolean;
  name: string;
  description: string | null;
  location_id: number;
  fqdn: string;
  scheme: string;
  behind_proxy: boolean;
  maintenance_mode: boolean;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  upload_size: number;
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
  created_at: string;
  updated_at: string;
  allocated_resources?: { memory: number; disk: number };
}

export interface AppLocation {
  id: number;
  short: string;
  long: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppAllocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  notes: string | null;
  assigned: boolean;
}

export interface AppNest {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppEgg {
  id: number;
  uuid: string;
  name: string;
  nest: number;
  author: string;
  description: string | null;
  docker_image: string;
  docker_images?: Record<string, string>;
  startup: string;
  created_at: string;
  updated_at: string;
  relationships?: {
    variables?: PteroList<AppEggVariable>;
  };
}

export interface AppEggVariable {
  id: number;
  egg_id: number;
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: boolean;
  user_editable: boolean;
  rules: string;
}

export interface CreateServerPayload {
  name: string;
  user: number;
  egg: number;
  docker_image: string;
  startup: string;
  environment: Record<string, string>;
  limits: AppServerLimits;
  feature_limits: AppServerFeatureLimits;
  deploy?: {
    locations: number[];
    dedicated_ip: boolean;
    port_range: string[];
  };
  allocation?: { default: number };
  external_id?: string;
  description?: string;
  start_on_completion?: boolean;
}

// ─── Client API ─────────────────────────────────────────────────────────

export interface ClientServer {
  server_owner: boolean;
  identifier: string;
  internal_id: number;
  uuid: string;
  name: string;
  node: string;
  description: string;
  status: string | null;
  is_suspended: boolean;
  is_installing: boolean;
  is_transferring: boolean;
  sftp_details: { ip: string; port: number };
  limits: AppServerLimits;
  feature_limits: AppServerFeatureLimits;
  invocation: string;
  relationships?: {
    allocations?: PteroList<ClientAllocation>;
    variables?: PteroList<ClientEggVariable>;
  };
}

export interface ClientAllocation {
  id: number;
  ip: string;
  ip_alias: string | null;
  port: number;
  notes: string | null;
  is_default: boolean;
}

export interface ClientEggVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  server_value: string;
  is_editable: boolean;
  rules: string;
}

export interface ServerResources {
  current_state: "running" | "starting" | "stopping" | "offline";
  is_suspended: boolean;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    uptime: number;
  };
}

export interface FileObject {
  name: string;
  mode: string;
  mode_bits: string;
  size: number;
  is_file: boolean;
  is_symlink: boolean;
  mimetype: string;
  created_at: string;
  modified_at: string;
}

export interface Backup {
  uuid: string;
  is_successful: boolean;
  is_locked: boolean;
  name: string;
  ignored_files: string[];
  checksum: string | null;
  bytes: number;
  created_at: string;
  completed_at: string | null;
}

export interface ClientDatabase {
  id: string;
  host: { address: string; port: number };
  name: string;
  username: string;
  connections_from: string;
  max_connections: number;
  relationships?: { password?: PteroItem<{ password: string }> };
}

export interface Schedule {
  id: number;
  name: string;
  cron: {
    day_of_week: string;
    day_of_month: string;
    month: string;
    hour: string;
    minute: string;
  };
  is_active: boolean;
  is_processing: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebsocketCredentials {
  token: string;
  socket: string;
}

export class PterodactylError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public errors?: unknown,
  ) {
    super(`Pterodactyl API error ${status}: ${detail}`);
    this.name = "PterodactylError";
  }
}

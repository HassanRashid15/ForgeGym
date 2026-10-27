# Database schema standards

Normalized as of migrations `20261026_normalize_gym_catalog_sync.sql` and `20261026_normalize_drop_profile_gym_cols.sql`.

## Identity

| Concept | Canonical field | Notes |
|--------|-----------------|--------|
| Auth user | `auth.users.id` | Supabase Auth |
| Profile lookup key | `profiles.user_id` | Prefer this in app queries; `profiles.id` is legacy-aligned to auth |
| Roles | `user_roles.role` (`app_role`) | Do **not** store role on `profiles` |
| Approval | `profiles.admin_approved` (+ timestamps) | Super-admin flag: `profiles.is_super_admin` |
| Gym tenancy | `profiles.gym_owner_id` → owner `auth.users.id` | Domain tables also use `gym_owner_id` (not `gyms.id` yet) |

## Gym catalog (source of truth)

`public.gyms` owns name, city, type, facilities, services, fees (`numeric`), media, coords, hours, operating days, publish flag.

- Unique per owner: `gyms.owner_user_id`
- Name uniqueness: `gyms_name_city_unique_idx` (or lookup index if duplicates existed)
- API may still accept/return `gym_*` aliases; writes go to `gyms` via [`src/lib/gyms/catalog.ts`](../src/lib/gyms/catalog.ts)

## Dual systems (intentional)

| Keep | Do not merge |
|------|----------------|
| `reviews` (platform feedback) | `gym_reviews` (per-gym ratings) — different products |
| `profiles.bmi` | `bmi_records` dropped (unused) |

## Out of scope (v1)

Remapping attendance / classes / reviews from `gym_owner_id` → `gyms.id` is a separate tenancy migration.

# Supabase one-off scripts

These SQL files are **manual** seed / repair scripts for the SQL Editor.
They are **not** incremental migrations — do not run them via `supabase db push` unless you know you need them.

| Script | Purpose |
|--------|---------|
| `20260910_seed_superadmin_with_password.sql` | Create `superadmin@forge.test` + password |
| `20260910_seed_super_admin.sql` | Older seed variant |
| `20260910_bootstrap_super_admin_complete.sql` | Full bootstrap + schema gaps |
| `20260910_master_admin_signup_fix.sql` | Master signup / trigger fix dump |
| `20260910_fix_superadmin_login.sql` | Login diagnostics / repair |
| `20260910_fix_superadmin_role_sidebar.sql` | Force admin role for seeded user |
| `20260910_force_superadmin_role.sql` | Force role for one email |

Schema changes belong in `../migrations/`.

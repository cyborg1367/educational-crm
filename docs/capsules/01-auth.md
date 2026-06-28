# Capsule 01 — Auth, Users & Tenancy

```yaml
microSkill:
  id: "auth.user"
  domain: "backend/app/**/(user|auth|security|organization|tenancy)*"
  depends_on: ["core.skeleton"]
  signature: |
    models:  Organization, User
    core:    security.py -> hash_password, verify_password, create_access_token, decode_token
    deps:    get_current_user, require_role(*roles), get_current_org (from token)
    tenancy: a scoping helper, e.g. scoped(query, model, org_id) OR a get_db-style dependency
             that yields (db, current_org) so every query filters by org_id
    routers: /auth/login (-> access token incl. org), /users CRUD (admin only)
    seed:    one Organization (your institute) + one admin User
  constraints:
    - "Organization: id, name, is_active, created_at, updated_at"
    - "User: email unique, password_hash, role, is_active, org_id -> Organization, department_id nullable, timestamps"
    - "role enum [admin, admission, department_manager, finance, teacher]"
    - "passwords hashed with passlib bcrypt; plaintext and hash NEVER returned in any response"
    - "JWT via python-jose; token carries user id AND org_id; expiry from Settings"
    - "require_role -> 403 when role not allowed; get_current_org reads org_id from the token"
    - "provide ONE tenancy scoping helper that all later modules use so org filtering is structural, not manual"
    - "seed exactly one Organization and one admin so you can log in"
  boilerplate: |
    def require_role(*roles):
        def checker(user: User = Depends(get_current_user)):
            if user.role not in roles:
                raise HTTPException(403, "forbidden")
            return user
        return checker

    # tenancy: every later query does -> q.filter(Model.org_id == current_org)
```

**Why here:** tenancy is foundational. Getting `org_id` + the scoping helper in before any business entity means every later capsule inherits tenant isolation for free.

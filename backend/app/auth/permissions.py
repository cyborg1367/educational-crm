"""Resource/action authorization matrix.

Every router in this codebase gates its mutating endpoints with
`Depends(get_current_user)` alone, which authenticates a caller but never
checks *what* they're allowed to do. Two routers (`course_class`, `user`)
additionally sprinkle `require_role(...)` calls with hand-picked role tuples
at each call site. Everywhere else — including `finance` (issuing invoices,
recording payments, refunds) and `enrollment` (creating, force-changing
status, dropping) — any authenticated user of any role can call the
endpoint directly; the restriction only exists in the frontend's
`lib/auth/role.ts` helpers, which is not a security boundary.

This module is the server-side mirror of that frontend policy: one
`PERMISSION_MATRIX` naming which roles may perform which (resource, action)
pair, and one dependency factory — `require_permission` — that routers call
instead of hand-rolling `require_role(...)` tuples. Centralizing the matrix
means the policy can be read (and audited) in one place instead of
reconstructed from scattered call sites, and `tests/test_permission_audit.py`
statically verifies that every mutating route in a protected router actually
depends on one of these entries, so a new endpoint added without a
permission check fails CI instead of shipping silently.

Keep this in sync with frontend/src/lib/auth/role.ts — that file is the
product-level spec for who can do what; this is where it's actually
enforced.
"""

from collections.abc import Callable

from app.auth.deps import require_role
from app.user.enums import UserRole
from app.user.model import User

# (resource, action) -> roles allowed to perform it.
# Mirrors frontend/src/lib/auth/role.ts:
#   canManageEnrollments -> admin, admission
#   canManageFinance     -> admin, finance
#   canManageClasses     -> admin, admission, department_manager (already
#                           enforced in course_class/router.py; not
#                           duplicated here yet — see module docstring)
PERMISSION_MATRIX: dict[tuple[str, str], frozenset[UserRole]] = {
    ("enrollment", "create"): frozenset({UserRole.admin, UserRole.admission}),
    ("enrollment", "update"): frozenset({UserRole.admin, UserRole.admission}),
    ("enrollment", "drop"): frozenset({UserRole.admin, UserRole.admission}),
    ("invoice", "create"): frozenset({UserRole.admin, UserRole.admission}),
    ("invoice", "update_installment"): frozenset(
        {UserRole.admin, UserRole.finance}
    ),
    ("payment", "create"): frozenset({UserRole.admin, UserRole.finance}),
    ("refund", "create"): frozenset({UserRole.admin, UserRole.finance}),
}


def require_permission(resource: str, action: str) -> Callable[..., User]:
    """FastAPI dependency restricting an endpoint to the roles registered
    for `(resource, action)` in PERMISSION_MATRIX.

    Raises `RuntimeError` at *route registration* time — not per-request —
    if the pair was never registered, so a typo'd resource/action name is a
    startup crash, not a silent open endpoint.
    """
    try:
        roles = PERMISSION_MATRIX[(resource, action)]
    except KeyError:
        raise RuntimeError(
            f"No PERMISSION_MATRIX entry for resource={resource!r}, "
            f"action={action!r}. Add one in app/auth/permissions.py before "
            "wiring it into a route."
        ) from None

    checker = require_role(*roles)
    # Marker read by tests/test_permission_audit.py's route introspection —
    # require_role() alone returns an anonymous closure indistinguishable
    # from "no auth dependency at all", so tag it explicitly.
    checker.__permission__ = (resource, action)  # type: ignore[attr-defined]
    return checker

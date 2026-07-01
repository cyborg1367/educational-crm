export type {
  CommandPaletteItem,
  NavGroup,
  NavItem,
  NavTree,
  UserRole,
} from "@/lib/nav/types";

export {
  getCommandPaletteItemsForRole,
  getNavTreeForRole,
  flattenNavTree,
  roleNavConfig,
} from "@/lib/nav/role-nav-config";

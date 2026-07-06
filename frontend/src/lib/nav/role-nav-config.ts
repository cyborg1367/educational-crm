import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Map,
  Receipt,
  Settings,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

import type {
  CommandPaletteItem,
  NavItem,
  NavTree,
  UserRole,
} from "@/lib/nav/types";

function item(
  id: string,
  label: string,
  href: string,
  icon?: NavItem["icon"],
  keywords?: string[],
): NavItem {
  return { id, label, href, icon, keywords };
}

const profileItem = item(
  "profile",
  "پروفایل",
  "/settings/profile",
  UserCircle,
  ["تنظیمات", "حساب"],
);

/** Admin — org oversight, full sitemap access. */
const adminNavTree: NavTree = [
  {
    id: "admin-primary",
    items: [
      item("dashboard", "داشبورد", "/dashboard", LayoutDashboard, ["خانه"]),
      item("people", "افراد", "/people", Users, ["مخاطب", "سرنخ"]),
      item("enrollments", "ثبت‌نام‌ها", "/enrollments", ClipboardList),
      item("invoices", "فاکتورها", "/invoices", Receipt, ["مالی"]),
      item("classes", "کلاس‌ها", "/classes", GraduationCap),
    ],
  },
  {
    id: "admin-catalog",
    label: "کاتالوگ آموزشی",
    items: [
      item("courses", "دوره‌ها", "/courses", BookOpen),
      item("roadmaps", "نقشه‌های راه", "/roadmaps", Map),
      item("departments", "دپارتمان‌ها", "/departments", Building2),
    ],
  },
  {
    id: "admin-operations",
    label: "عملیات",
    items: [
      item("tasks", "وظایف", "/tasks", ClipboardList, ["صندوق ورودی"]),
      item("calendar", "تقویم", "/calendar", Calendar),
    ],
  },
  {
    id: "admin-reports",
    label: "گزارش‌ها",
    items: [
      item("reports-revenue", "درآمد", "/reports/revenue", BarChart3),
      item(
        "reports-enrollments",
        "ثبت‌نام",
        "/reports/enrollments",
        BarChart3,
      ),
      item("reports-collection", "وصول", "/reports/collection", Wallet),
    ],
  },
  {
    id: "admin-settings",
    label: "تنظیمات",
    items: [
      item(
        "users",
        "کاربران و نقش‌ها",
        "/users",
        UserCircle,
        ["مدیر", "پذیرش", "نقش"],
      ),
      item("settings-org", "سازمان", "/settings/org", Settings),
      profileItem,
    ],
  },
];

/** Admission — Person inbox → Consultation → outcome; task follow-up. */
const admissionNavTree: NavTree = [
  {
    id: "admission-primary",
    items: [
      item("dashboard", "داشبورد", "/dashboard", LayoutDashboard, [
        "سرنخ",
        "مشاوره",
      ]),
      item("people", "افراد", "/people", Users, ["صندوق ورودی", "سرنخ"]),
      item("enrollments", "ثبت‌نام‌ها", "/enrollments", ClipboardList),
    ],
  },
  {
    id: "admission-workflow",
    label: "پیگیری",
    items: [
      item("tasks", "وظایف", "/tasks", ClipboardList, ["پیگیری", "صندوق"]),
      item("calendar", "تقویم", "/calendar", Calendar, ["مشاوره"]),
    ],
  },
  {
    id: "admission-account",
    label: "حساب",
    items: [profileItem],
  },
];

/** Finance — invoice/installment queue, collection reports. */
const financeNavTree: NavTree = [
  {
    id: "finance-primary",
    items: [
      item("dashboard", "داشبورد", "/dashboard", LayoutDashboard, [
        "وصول",
        "معوق",
      ]),
      item("invoices", "فاکتورها", "/invoices", Receipt, [
        "اقساط",
        "صندوق مالی",
      ]),
      item("enrollments", "ثبت‌نام‌ها", "/enrollments", ClipboardList),
    ],
  },
  {
    id: "finance-reports",
    label: "گزارش‌ها",
    items: [
      item("reports-revenue", "درآمد", "/reports/revenue", BarChart3),
      item(
        "reports-enrollments",
        "ثبت‌نام",
        "/reports/enrollments",
        BarChart3,
      ),
      item(
        "reports-collection",
        "وصول",
        "/reports/collection",
        Wallet,
        ["معوق", "اقساط"],
      ),
    ],
  },
  {
    id: "finance-operations",
    label: "عملیات",
    items: [
      item("tasks", "وظایف", "/tasks", ClipboardList),
      item("calendar", "تقویم", "/calendar", Calendar, ["سررسید"]),
    ],
  },
  {
    id: "finance-account",
    label: "حساب",
    items: [profileItem],
  },
];

/** Teacher — class roster, attendance; read-only person/enrollment for own classes. */
const teacherNavTree: NavTree = [
  {
    id: "teacher-primary",
    items: [
      item("dashboard", "داشبورد", "/dashboard", LayoutDashboard, [
        "امروز",
        "کلاس",
      ]),
      item("classes", "کلاس‌ها", "/classes", GraduationCap, [
        "حضور",
        "لیست",
      ]),
    ],
  },
  {
    id: "teacher-roster",
    label: "دانش‌آموزان",
    items: [
      item("people", "افراد", "/people", Users, ["فقط خواندنی"]),
      item("enrollments", "ثبت‌نام‌ها", "/enrollments", ClipboardList),
    ],
  },
  {
    id: "teacher-schedule",
    label: "برنامه",
    items: [item("calendar", "تقویم", "/calendar", Calendar)],
  },
  {
    id: "teacher-account",
    label: "حساب",
    items: [profileItem],
  },
];

/** Department Manager — task inbox, journey oversight for department. */
const departmentManagerNavTree: NavTree = [
  {
    id: "dept-primary",
    items: [
      item("dashboard", "داشبورد", "/dashboard", LayoutDashboard, [
        "وظایف",
        "دپارتمان",
      ]),
      item("tasks", "صندوق کار", "/tasks", ClipboardList, [
        "ارجاع",
        "مشاوره",
        "صندوق ورودی",
      ]),
    ],
  },
  {
    id: "dept-oversight",
    label: "نظارت دپارتمان",
    items: [
      item("people", "افراد", "/people", Users, ["مسیر", "سفر"]),
      item("enrollments", "ثبت‌نام‌ها", "/enrollments", ClipboardList),
      item("classes", "کلاس‌ها", "/classes", GraduationCap),
    ],
  },
  {
    id: "dept-schedule",
    label: "برنامه",
    items: [item("calendar", "تقویم", "/calendar", Calendar)],
  },
  {
    id: "dept-account",
    label: "حساب",
    items: [profileItem],
  },
];

export const roleNavConfig: Record<UserRole, NavTree> = {
  admin: adminNavTree,
  admission: admissionNavTree,
  finance: financeNavTree,
  teacher: teacherNavTree,
  department_manager: departmentManagerNavTree,
};

export function getNavTreeForRole(role: UserRole): NavTree {
  return roleNavConfig[role];
}

export function flattenNavTree(tree: NavTree): CommandPaletteItem[] {
  return tree.flatMap((group) =>
    group.items.map((navItem) => ({
      id: navItem.id,
      label: navItem.label,
      href: navItem.href,
      group: group.label,
      keywords: navItem.keywords,
    })),
  );
}

export function getCommandPaletteItemsForRole(
  role: UserRole,
): CommandPaletteItem[] {
  return flattenNavTree(getNavTreeForRole(role));
}

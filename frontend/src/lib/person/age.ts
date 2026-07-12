import type { StorageDate } from "@/lib/locale/date";

/** Whether a person with this birth date is under 18 today. Mirrors the
 * backend's age check in app/person/service.py::_is_minor. */
export function isPersonMinor(birthDate: StorageDate | null): boolean {
  if (!birthDate) {
    return false;
  }
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age < 18;
}

import Image from "next/image";

export function LoginHeroPanel() {
  return (
    <div className="relative hidden min-h-[520px] w-[min(100%,420px)] shrink-0 overflow-hidden lg:block">
      <Image
        src="/images/login-hero-educational-crm.png"
        alt="مدیریت هوشمند آموزشگاه"
        fill
        priority
        sizes="420px"
        className="object-cover object-center"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.35)] via-transparent to-transparent"
      />
    </div>
  );
}

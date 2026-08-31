"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Package, Settings, ShoppingBag, Leaf } from "lucide-react";

const NAV = [
  { href: "/", label: "Inbox", icon: Inbox },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/catalog", label: "Catalogue", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="no-print flex w-60 shrink-0 flex-col bg-ink-950 text-ink-100">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-float">
          <Leaf size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide text-white">Aunty Hong</div>
          <div className="text-xs text-ink-200">Hong · customer service</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-brand-600 text-white shadow-card"
                  : "text-ink-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] leading-5 text-ink-200">
        Hong talks to customers 24/7 once hosted.
        <br />
        This screen is for audit and hard cases.
      </div>
    </aside>
  );
}

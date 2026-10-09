import {
  Briefcase,
  Building2,
  Car,
  CircleDollarSign,
  Gift,
  Gem,
  Handshake,
  Heart,
  HelpCircle,
  Home,
  Landmark,
  Package,
  Pickaxe,
  ShoppingBag,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export interface CitySection {
  id: string;
  href: string;
  icon: LucideIcon;
  group: "economy" | "assets" | "resources" | "social" | "more";
  label: (t: Dictionary) => string;
  hint: (t: Dictionary) => string;
}

export const CITY_SECTIONS: readonly CitySection[] = [
  { id: "jobs", href: "/city/jobs", icon: Briefcase, group: "economy", label: (t) => t.city.jobs, hint: (t) => t.city.jobsHint },
  { id: "bank", href: "/city/bank", icon: Landmark, group: "economy", label: (t) => t.city.bank, hint: (t) => t.city.bankHint },
  { id: "shop", href: "/city/shop", icon: ShoppingBag, group: "economy", label: (t) => t.city.shop, hint: (t) => t.city.shopHint },
  { id: "vip", href: "/city/vip", icon: Sparkles, group: "economy", label: (t) => t.city.vip, hint: (t) => t.city.vipHint },
  { id: "donate", href: "/city/donate", icon: CircleDollarSign, group: "economy", label: (t) => t.city.donate, hint: (t) => t.city.donateHint },
  { id: "promo", href: "/city/promo", icon: Ticket, group: "economy", label: (t) => t.city.promo, hint: (t) => t.city.promoHint },
  { id: "realty", href: "/city/realty", icon: Home, group: "assets", label: (t) => t.city.realty, hint: (t) => t.city.realtyHint },
  { id: "cars", href: "/city/cars", icon: Car, group: "assets", label: (t) => t.city.cars, hint: (t) => t.city.carsHint },
  { id: "business", href: "/city/business", icon: Building2, group: "assets", label: (t) => t.city.business, hint: (t) => t.city.businessHint },
  { id: "assets", href: "/city/assets", icon: Wallet, group: "assets", label: (t) => t.city.assets, hint: (t) => t.city.assetsHint },
  { id: "cases", href: "/city/cases", icon: Package, group: "assets", label: (t) => t.city.cases, hint: (t) => t.city.casesHint },
  { id: "resources", href: "/city/resources", icon: Pickaxe, group: "resources", label: (t) => t.city.resources, hint: (t) => t.city.resourcesHint },
  { id: "referrals", href: "/city/referrals", icon: Users, group: "social", label: (t) => t.city.referrals, hint: (t) => t.city.referralsHint },
  { id: "corp", href: "/city/corp", icon: Handshake, group: "social", label: (t) => t.city.corp, hint: (t) => t.city.corpHint },
  { id: "marriage", href: "/city/marriage", icon: Heart, group: "social", label: (t) => t.city.marriage, hint: (t) => t.city.marriageHint },
  { id: "events", href: "/city/events", icon: Gift, group: "more", label: (t) => t.city.events, hint: (t) => t.city.eventsHint },
  { id: "help", href: "/city/help", icon: HelpCircle, group: "more", label: (t) => t.city.help, hint: (t) => t.city.helpHint },
  { id: "bayhan", href: "/store", icon: Gem, group: "economy", label: (t) => t.city.bayhan, hint: (t) => t.city.bayhanHint },
];

export const CITY_GROUPS: readonly { id: CitySection["group"]; title: (t: Dictionary) => string }[] = [
  { id: "economy", title: (t) => t.city.groupEconomy },
  { id: "assets", title: (t) => t.city.groupAssets },
  { id: "resources", title: (t) => t.city.groupResources },
  { id: "social", title: (t) => t.city.groupSocial },
  { id: "more", title: (t) => t.city.groupMore },
];

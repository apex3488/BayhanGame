/** Domain models for lifestyle / economy features mirrored from the Python bot. */

export interface LocalizedName {
  ru: string;
  uz: string;
  en: string;
}

export interface JobDef {
  id: string;
  name: LocalizedName;
  description: LocalizedName;
  incomeMin: number;
  incomeMax: number;
  cooldownSec: number;
  requireCar: boolean;
  minCapitalUsd: number;
}

export interface OwnedAsset {
  id: string;
  level: number;
  /** ISO timestamp of last income collect; null = never collected. */
  lastCollectAt: string | null;
}

export interface RealtyDef {
  id: string;
  name: LocalizedName;
  category: string;
  priceUsd: number;
  incomePerHour: number;
  maxLevel: number;
  upgradeCostBase: number;
}

export interface CarDef {
  id: string;
  name: LocalizedName;
  brand: string;
  model: string;
  category: string;
  priceUsd: number;
  power: number;
  maxSpeed: number;
  prestige: number;
}

export interface BusinessDef {
  id: string;
  name: LocalizedName;
  category: string;
  priceUsd: number;
  incomePerHour: number;
  expensePerHour: number;
  maxLevel: number;
  upgradeCostBase: number;
}

export interface CaseDef {
  id: string;
  name: LocalizedName;
  rarity: "common" | "rare" | "epic" | "legendary";
  priceUsd: number;
  rewards: CaseRewardDef[];
}

export interface CaseRewardDef {
  id: string;
  name: LocalizedName;
  rarity: "common" | "rare" | "epic" | "legendary";
  weight: number;
  kind: "usd" | "btc" | "resource";
  amount: number;
  resourceCode?: string;
}

export interface ResourceDef {
  id: string;
  name: LocalizedName;
  buyPrice: number;
  sellPrice: number;
  mineChance: number;
  mineMin: number;
  mineMax: number;
}

export interface ShopDef {
  id: string;
  name: LocalizedName;
  description: LocalizedName;
  category: "resource" | "premium";
  priceUsd: number;
  resourceCode?: string;
  resourceAmount?: number;
}

export interface BankTerm {
  days: number;
  ratePercent: number;
}

export interface BankDeposit {
  id: string;
  amountUsd: number;
  days: number;
  ratePercent: number;
  startsAt: string;
  endsAt: string;
  claimed: boolean;
}

export interface VipLevel {
  level: number;
  dailyMultiplier: number;
}

export interface DonatePack {
  stars: number;
  usd: number;
}

export interface CorpBuildingDef {
  id: string;
  name: LocalizedName;
  priceUsd: number;
  prestigeBonus: number;
  incomeBonusPercent: number;
}

export interface CorpTaskDef {
  id: string;
  name: LocalizedName;
  description: LocalizedName;
  target: number;
  rewardUsd: number;
  prestigeReward: number;
}

export interface LifestyleSnapshot {
  jobsCooldownUntil: Record<string, string>;
  realty: OwnedAsset[];
  cars: string[];
  businesses: OwnedAsset[];
  resources: Record<string, number>;
  bankDeposits: BankDeposit[];
  bankAccountUsd: number;
  vipLevel: number | null;
  vipExpiresAt: string | null;
  referralsCount: number;
  marriagePartner: string | null;
  corporationName: string | null;
  lastMineAt: string | null;
  activeJobId: string | null;
}

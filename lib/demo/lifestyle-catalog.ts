/**
 * Catalogs mirrored from bot/services/*_seed.py and settings_service.py.
 * Localized labels live here so UI works offline; live servers can replace them later.
 */
import type {
  BusinessDef,
  CaseDef,
  CarDef,
  CorpBuildingDef,
  CorpTaskDef,
  DonatePack,
  JobDef,
  RealtyDef,
  ResourceDef,
  ShopDef,
  VipLevel,
  BankTerm,
} from "@/types/lifestyle";

const n = (ru: string, uz: string, en: string) => ({ ru, uz, en });

export const BANK_TERMS: readonly BankTerm[] = [
  { days: 30, ratePercent: 3 },
  { days: 90, ratePercent: 8 },
  { days: 180, ratePercent: 15 },
];

export const VIP_LEVELS: readonly VipLevel[] = [
  { level: 1, dailyMultiplier: 1.1 },
  { level: 2, dailyMultiplier: 1.25 },
  { level: 3, dailyMultiplier: 1.5 },
  { level: 4, dailyMultiplier: 2 },
];

export const DONATE_PACKS: readonly DonatePack[] = [
  { stars: 15, usd: 20_000 },
  { stars: 50, usd: 80_000 },
  { stars: 100, usd: 150_000 },
];

export const JOBS: readonly JobDef[] = [
  { id: "courier", name: n("Курьер", "Kuryer", "Courier"), description: n("Доставка по городу", "Shaharda yetkazib berish", "City deliveries"), incomeMin: 20_000, incomeMax: 50_000, cooldownSec: 30 * 60, requireCar: false, minCapitalUsd: 0 },
  { id: "taxi", name: n("Таксист", "Taksi", "Taxi driver"), description: n("Нужна машина", "Avtomobil kerak", "Requires a car"), incomeMin: 30_000, incomeMax: 70_000, cooldownSec: 40 * 60, requireCar: true, minCapitalUsd: 0 },
  { id: "mechanic", name: n("Механик", "Mexanik", "Mechanic"), description: n("Ремонт транспорта", "Transport ta'miri", "Vehicle repair"), incomeMin: 40_000, incomeMax: 90_000, cooldownSec: 60 * 60, requireCar: false, minCapitalUsd: 500_000 },
  { id: "programmer", name: n("Программист", "Dasturchi", "Programmer"), description: n("IT-проекты", "IT loyihalar", "IT projects"), incomeMin: 60_000, incomeMax: 130_000, cooldownSec: 90 * 60, requireCar: false, minCapitalUsd: 1_000_000 },
  { id: "engineer", name: n("Инженер", "Muhandis", "Engineer"), description: n("Сложные задачи", "Murakkab vazifalar", "Complex work"), incomeMin: 80_000, incomeMax: 180_000, cooldownSec: 2 * 60 * 60, requireCar: false, minCapitalUsd: 3_000_000 },
  { id: "financier", name: n("Финансист", "Moliyachi", "Financier"), description: n("Крупный капитал", "Katta kapital", "Large capital"), incomeMin: 120_000, incomeMax: 300_000, cooldownSec: 3 * 60 * 60, requireCar: false, minCapitalUsd: 10_000_000 },
  { id: "entrepreneur", name: n("Предприниматель", "Tadbirkor", "Entrepreneur"), description: n("Свои проекты", "O'z loyihalari", "Own ventures"), incomeMin: 200_000, incomeMax: 500_000, cooldownSec: 4 * 60 * 60, requireCar: false, minCapitalUsd: 25_000_000 },
  { id: "director", name: n("Директор", "Direktor", "Director"), description: n("Управление империей", "Imperiyani boshqarish", "Empire management"), incomeMin: 400_000, incomeMax: 1_000_000, cooldownSec: 6 * 60 * 60, requireCar: false, minCapitalUsd: 100_000_000 },
];

export const REALTY: readonly RealtyDef[] = [
  { id: "studio", name: n("Студия", "Studiya", "Studio"), category: "apartment", priceUsd: 50_000, incomePerHour: 500, maxLevel: 5, upgradeCostBase: 15_000 },
  { id: "apartment", name: n("Квартира", "Kvartira", "Apartment"), category: "apartment", priceUsd: 150_000, incomePerHour: 1_500, maxLevel: 5, upgradeCostBase: 40_000 },
  { id: "townhouse", name: n("Таунхаус", "Taunxaus", "Townhouse"), category: "house", priceUsd: 400_000, incomePerHour: 4_000, maxLevel: 5, upgradeCostBase: 100_000 },
  { id: "villa", name: n("Вилла", "Villa", "Villa"), category: "house", priceUsd: 1_000_000, incomePerHour: 10_000, maxLevel: 5, upgradeCostBase: 250_000 },
  { id: "penthouse", name: n("Пентхаус", "Pentxaus", "Penthouse"), category: "penthouse", priceUsd: 3_000_000, incomePerHour: 28_000, maxLevel: 5, upgradeCostBase: 600_000 },
  { id: "mansion", name: n("Особняк", "Saroy", "Mansion"), category: "mansion", priceUsd: 8_000_000, incomePerHour: 70_000, maxLevel: 5, upgradeCostBase: 1_500_000 },
  { id: "island", name: n("Остров", "Orol", "Island"), category: "island", priceUsd: 25_000_000, incomePerHour: 200_000, maxLevel: 5, upgradeCostBase: 4_000_000 },
];

export const CARS: readonly CarDef[] = [
  { id: "sedan", name: n("Седан", "Sedan", "Sedan"), brand: "Toyota", model: "Camry", category: "sedan", priceUsd: 30_000, power: 180, maxSpeed: 210, prestige: 1 },
  { id: "sport_coupe", name: n("Спорткупе", "Sport kupe", "Sport coupe"), brand: "BMW", model: "M4", category: "sport", priceUsd: 120_000, power: 480, maxSpeed: 280, prestige: 2 },
  { id: "luxury_sedan", name: n("Люкс-седан", "Lyuks sedan", "Luxury sedan"), brand: "Mercedes-Benz", model: "S-Class", category: "luxury", priceUsd: 250_000, power: 430, maxSpeed: 250, prestige: 3 },
  { id: "supercar", name: n("Суперкар", "Superkar", "Supercar"), brand: "Lamborghini", model: "Huracan", category: "super", priceUsd: 900_000, power: 630, maxSpeed: 325, prestige: 4 },
  { id: "hypercar", name: n("Гиперкар", "Giperkar", "Hypercar"), brand: "Bugatti", model: "Chiron", category: "hyper", priceUsd: 3_000_000, power: 1500, maxSpeed: 420, prestige: 5 },
  { id: "suv_lux", name: n("Люкс-SUV", "Lyuks SUV", "Luxury SUV"), brand: "Rolls-Royce", model: "Cullinan", category: "suv", priceUsd: 500_000, power: 570, maxSpeed: 250, prestige: 4 },
];

export const BUSINESSES: readonly BusinessDef[] = [
  { id: "coffee_shop", name: n("Кофейня", "Kofe do'koni", "Coffee shop"), category: "shop", priceUsd: 80_000, incomePerHour: 1_200, expensePerHour: 200, maxLevel: 5, upgradeCostBase: 25_000 },
  { id: "restaurant", name: n("Ресторан", "Restoran", "Restaurant"), category: "restaurant", priceUsd: 300_000, incomePerHour: 4_000, expensePerHour: 800, maxLevel: 5, upgradeCostBase: 80_000 },
  { id: "car_wash", name: n("Автомойка", "Avtomoyka", "Car wash"), category: "service", priceUsd: 150_000, incomePerHour: 2_200, expensePerHour: 400, maxLevel: 5, upgradeCostBase: 45_000 },
  { id: "hotel", name: n("Отель", "Mehmonxona", "Hotel"), category: "hotel", priceUsd: 1_500_000, incomePerHour: 18_000, expensePerHour: 3_000, maxLevel: 5, upgradeCostBase: 350_000 },
  { id: "factory", name: n("Завод", "Zavod", "Factory"), category: "factory", priceUsd: 5_000_000, incomePerHour: 55_000, expensePerHour: 9_000, maxLevel: 5, upgradeCostBase: 1_200_000 },
  { id: "nightclub", name: n("Ночной клуб", "Tungi klub", "Nightclub"), category: "entertainment", priceUsd: 2_000_000, incomePerHour: 24_000, expensePerHour: 5_000, maxLevel: 5, upgradeCostBase: 450_000 },
];

export const CASES: readonly CaseDef[] = [
  {
    id: "starter", name: n("Стартовый кейс", "Boshlang'ich keys", "Starter case"), rarity: "common", priceUsd: 10_000,
    rewards: [
      { id: "s1", name: n("$5 000", "$5 000", "$5,000"), rarity: "common", weight: 50, kind: "usd", amount: 5_000 },
      { id: "s2", name: n("$15 000", "$15 000", "$15,000"), rarity: "common", weight: 30, kind: "usd", amount: 15_000 },
      { id: "s3", name: n("$30 000", "$30 000", "$30,000"), rarity: "rare", weight: 15, kind: "usd", amount: 30_000 },
      { id: "s4", name: n("Дерево ×5", "Yog'och ×5", "Wood ×5"), rarity: "rare", weight: 5, kind: "resource", amount: 5, resourceCode: "wood" },
    ],
  },
  {
    id: "silver", name: n("Серебряный кейс", "Kumush keys", "Silver case"), rarity: "rare", priceUsd: 50_000,
    rewards: [
      { id: "a1", name: n("$25 000", "$25 000", "$25,000"), rarity: "common", weight: 40, kind: "usd", amount: 25_000 },
      { id: "a2", name: n("$75 000", "$75 000", "$75,000"), rarity: "rare", weight: 25, kind: "usd", amount: 75_000 },
      { id: "a3", name: n("0.001 BTC", "0.001 BTC", "0.001 BTC"), rarity: "rare", weight: 20, kind: "btc", amount: 0.001 },
      { id: "a4", name: n("Железо ×3", "Temir ×3", "Iron ×3"), rarity: "epic", weight: 10, kind: "resource", amount: 3, resourceCode: "iron" },
      { id: "a5", name: n("$150 000", "$150 000", "$150,000"), rarity: "epic", weight: 5, kind: "usd", amount: 150_000 },
    ],
  },
  {
    id: "gold", name: n("Золотой кейс", "Oltin keys", "Gold case"), rarity: "epic", priceUsd: 200_000,
    rewards: [
      { id: "g1", name: n("$100 000", "$100 000", "$100,000"), rarity: "rare", weight: 35, kind: "usd", amount: 100_000 },
      { id: "g2", name: n("$300 000", "$300 000", "$300,000"), rarity: "epic", weight: 25, kind: "usd", amount: 300_000 },
      { id: "g3", name: n("0.005 BTC", "0.005 BTC", "0.005 BTC"), rarity: "epic", weight: 20, kind: "btc", amount: 0.005 },
      { id: "g4", name: n("Алмаз ×2", "Olmos ×2", "Diamond ×2"), rarity: "legendary", weight: 12, kind: "resource", amount: 2, resourceCode: "diamond" },
      { id: "g5", name: n("$750 000", "$750 000", "$750,000"), rarity: "legendary", weight: 8, kind: "usd", amount: 750_000 },
    ],
  },
  {
    id: "diamond", name: n("Алмазный кейс", "Olmos keys", "Diamond case"), rarity: "legendary", priceUsd: 1_000_000,
    rewards: [
      { id: "d1", name: n("$500 000", "$500 000", "$500,000"), rarity: "epic", weight: 30, kind: "usd", amount: 500_000 },
      { id: "d2", name: n("$1 500 000", "$1 500 000", "$1,500,000"), rarity: "legendary", weight: 25, kind: "usd", amount: 1_500_000 },
      { id: "d3", name: n("0.02 BTC", "0.02 BTC", "0.02 BTC"), rarity: "legendary", weight: 20, kind: "btc", amount: 0.02 },
      { id: "d4", name: n("0.05 BTC", "0.05 BTC", "0.05 BTC"), rarity: "legendary", weight: 10, kind: "btc", amount: 0.05 },
      { id: "d5", name: n("Энергия ×10", "Energiya ×10", "Energy ×10"), rarity: "epic", weight: 10, kind: "resource", amount: 10, resourceCode: "energy" },
      { id: "d6", name: n("$5 000 000", "$5 000 000", "$5,000,000"), rarity: "legendary", weight: 5, kind: "usd", amount: 5_000_000 },
    ],
  },
];

export const RESOURCES: readonly ResourceDef[] = [
  { id: "wood", name: n("Дерево", "Yog'och", "Wood"), buyPrice: 50, sellPrice: 30, mineChance: 45, mineMin: 1, mineMax: 5 },
  { id: "stone", name: n("Камень", "Tosh", "Stone"), buyPrice: 80, sellPrice: 50, mineChance: 35, mineMin: 1, mineMax: 4 },
  { id: "iron", name: n("Железо", "Temir", "Iron"), buyPrice: 200, sellPrice: 140, mineChance: 18, mineMin: 1, mineMax: 3 },
  { id: "diamond", name: n("Алмаз", "Olmos", "Diamond"), buyPrice: 2_000, sellPrice: 1_500, mineChance: 4, mineMin: 1, mineMax: 1 },
  { id: "energy", name: n("Энергия", "Energiya", "Energy"), buyPrice: 100, sellPrice: 60, mineChance: 25, mineMin: 1, mineMax: 3 },
];

export const SHOP_ITEMS: readonly ShopDef[] = [
  { id: "buy_wood", name: n("Купить дерево", "Yog'och sotib olish", "Buy wood"), description: n("1 ед. дерева", "1 dona yog'och", "1 wood"), category: "resource", priceUsd: 50, resourceCode: "wood", resourceAmount: 1 },
  { id: "buy_stone", name: n("Купить камень", "Tosh sotib olish", "Buy stone"), description: n("1 ед. камня", "1 dona tosh", "1 stone"), category: "resource", priceUsd: 80, resourceCode: "stone", resourceAmount: 1 },
  { id: "buy_iron", name: n("Купить железо", "Temir sotib olish", "Buy iron"), description: n("1 ед. железа", "1 dona temir", "1 iron"), category: "resource", priceUsd: 200, resourceCode: "iron", resourceAmount: 1 },
  { id: "buy_diamond", name: n("Купить алмаз", "Olmos sotib olish", "Buy diamond"), description: n("1 алмаз", "1 olmos", "1 diamond"), category: "resource", priceUsd: 2_000, resourceCode: "diamond", resourceAmount: 1 },
  { id: "buy_energy", name: n("Купить энергию", "Energiya sotib olish", "Buy energy"), description: n("1 ед. энергии", "1 dona energiya", "1 energy"), category: "resource", priceUsd: 100, resourceCode: "energy", resourceAmount: 1 },
  { id: "thor_hammer", name: n("Молот Тора", "Tor bolg'asi", "Thor's hammer"), description: n("Премиум-предмет · 5 зарядов", "Premium · 5 zaryad", "Premium item · 5 charges"), category: "premium", priceUsd: 5_000_000 },
  { id: "zeus_lightning", name: n("Молния Зевса", "Zevs chaqmog'i", "Zeus lightning"), description: n("Премиум-предмет · 5 зарядов", "Premium · 5 zaryad", "Premium item · 5 charges"), category: "premium", priceUsd: 7_000_000 },
];

export const CORP_BUILDINGS: readonly CorpBuildingDef[] = [
  { id: "hq", name: n("Штаб-квартира", "Bosh ofis", "Headquarters"), priceUsd: 500_000, prestigeBonus: 50, incomeBonusPercent: 5 },
  { id: "warehouse", name: n("Склад", "Ombor", "Warehouse"), priceUsd: 250_000, prestigeBonus: 20, incomeBonusPercent: 3 },
  { id: "office", name: n("Офис", "Ofis", "Office"), priceUsd: 750_000, prestigeBonus: 40, incomeBonusPercent: 7 },
  { id: "lab", name: n("Лаборатория", "Laboratoriya", "Lab"), priceUsd: 1_500_000, prestigeBonus: 80, incomeBonusPercent: 10 },
  { id: "tower", name: n("Башня", "Minora", "Tower"), priceUsd: 5_000_000, prestigeBonus: 200, incomeBonusPercent: 15 },
];

export const CORP_TASKS: readonly CorpTaskDef[] = [
  { id: "recruit_5", name: n("Набрать 5 участников", "5 a'zo yig'ish", "Recruit 5 members"), description: n("Пригласите друзей в корпорацию", "Do'stlarni korporatsiyaga taklif qiling", "Invite friends into the corp"), target: 5, rewardUsd: 100_000, prestigeReward: 25 },
  { id: "deposit_pool", name: n("Пополнить казну", "G'aznani to'ldirish", "Fund the treasury"), description: n("10 взносов в общий пул", "Umumiy pulga 10 badal", "10 deposits into the pool"), target: 10, rewardUsd: 250_000, prestigeReward: 40 },
  { id: "build_empire", name: n("Построить империю", "Imperiya qurish", "Build an empire"), description: n("Возведите 3 здания", "3 bino quring", "Construct 3 buildings"), target: 3, rewardUsd: 500_000, prestigeReward: 75 },
];

export const SELL_RATIO = 0.7;
export const MINING_COOLDOWN_SEC = 60;

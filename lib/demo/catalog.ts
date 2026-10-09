import type { Rarity, StoreCategory } from "@/types/game";

export interface LocalizedText {
  ru: string;
  uz: string;
  en: string;
}

export interface DemoStoreItem {
  id: string;
  category: StoreCategory;
  name: LocalizedText;
  description: LocalizedText;
  rarity: Rarity;
  priceUsd: number;
  purchasable: boolean;
  limitedQuantity: number | null;
  soldCount: number | null;
  featured: boolean;
  preview: string;
}

type Def = Omit<DemoStoreItem, "purchasable" | "limitedQuantity" | "soldCount" | "featured"> &
  Partial<Pick<DemoStoreItem, "purchasable" | "limitedQuantity" | "soldCount" | "featured">>;

const item = (def: Def): DemoStoreItem => ({
  purchasable: true,
  limitedQuantity: null,
  soldCount: null,
  featured: false,
  ...def,
});

/** Codes follow bot/services/cosmetics_catalog.py so demo items map 1:1 to real ones later. */
export const DEMO_CATALOG: DemoStoreItem[] = [
  // Frames
  item({
    id: "frame_cyber", category: "frame", rarity: "common", priceUsd: 5_000, preview: "frame-cyber",
    name: { ru: "Cyber", uz: "Cyber", en: "Cyber" },
    description: { ru: "Тонкий технологичный контур для аватара.", uz: "Avatar uchun nozik texnologik kontur.", en: "A clean tech outline for your avatar." },
  }),
  item({
    id: "frame_ice", category: "frame", rarity: "rare", priceUsd: 20_000, preview: "frame-ice",
    name: { ru: "Ice", uz: "Ice", en: "Ice" },
    description: { ru: "Холодное сияние с двойной гранью.", uz: "Ikki qirrali sovuq yorqinlik.", en: "A cold glow with a double edge." },
  }),
  item({
    id: "frame_neon", category: "frame", rarity: "rare", priceUsd: 25_000, preview: "frame-neon", featured: true,
    name: { ru: "Neon", uz: "Neon", en: "Neon" },
    description: { ru: "Яркое синее кольцо с мягкой подсветкой.", uz: "Yumshoq yoritilgan yorqin ko'k halqa.", en: "A bright blue ring with a soft glow." },
  }),
  item({
    id: "frame_diamond", category: "frame", rarity: "epic", priceUsd: 50_000, preview: "frame-diamond", featured: true,
    name: { ru: "Diamond", uz: "Diamond", en: "Diamond" },
    description: { ru: "Гранёная рамка с переливом света.", uz: "Yorug'lik jilosi bilan qirrali ramka.", en: "A faceted frame with shifting light." },
  }),
  item({
    id: "frame_matrix", category: "frame", rarity: "epic", priceUsd: 60_000, preview: "frame-matrix",
    name: { ru: "Matrix", uz: "Matrix", en: "Matrix" },
    description: { ru: "Пунктирная орбита из цифровых сегментов.", uz: "Raqamli segmentlardan iborat orbita.", en: "A dashed orbit of digital segments." },
  }),
  item({
    id: "frame_galaxy", category: "frame", rarity: "legendary", priceUsd: 175_000, preview: "frame-galaxy",
    name: { ru: "Galaxy", uz: "Galaxy", en: "Galaxy" },
    description: { ru: "Вращающееся кольцо с бело-синим градиентом.", uz: "Oq-ko'k gradientli aylanuvchi halqa.", en: "A rotating ring with a white-blue gradient." },
  }),
  item({
    id: "frame_black", category: "frame", rarity: "legendary", priceUsd: 200_000, preview: "frame-black",
    name: { ru: "Black Edition", uz: "Black Edition", en: "Black Edition" },
    description: { ru: "Глубокий чёрный контур с белой гранью.", uz: "Oq qirrali chuqur qora kontur.", en: "Deep black outline with a white edge." },
  }),
  item({
    id: "frame_limited", category: "frame", rarity: "limited", priceUsd: 1_000_000, preview: "frame-limited",
    limitedQuantity: 100, soldCount: 63, featured: true,
    name: { ru: "BAYHAN Origin", uz: "BAYHAN Origin", en: "BAYHAN Origin" },
    description: { ru: "Нумерованная рамка первого сезона. Тираж 100 копий.", uz: "Birinchi mavsumning raqamlangan ramkasi. 100 nusxa.", en: "Numbered first-season frame. 100 copies only." },
  }),
  // Badges
  item({
    id: "badge_high_roller", category: "badge", rarity: "rare", priceUsd: 40_000, preview: "badge-bolt",
    name: { ru: "High Roller", uz: "High Roller", en: "High Roller" },
    description: { ru: "Для тех, кто не боится крупных ставок.", uz: "Katta stavkalardan qo'rqmaydiganlar uchun.", en: "For players who go big." },
  }),
  item({
    id: "badge_collector", category: "badge", rarity: "epic", priceUsd: 80_000, preview: "badge-gem",
    name: { ru: "Collector", uz: "Collector", en: "Collector" },
    description: { ru: "Знак настоящего коллекционера предметов.", uz: "Haqiqiy kolleksioner belgisi.", en: "The mark of a true collector." },
  }),
  item({
    id: "badge_millionaire", category: "badge", rarity: "epic", priceUsd: 100_000, preview: "badge-crown", featured: true,
    name: { ru: "Millionaire", uz: "Millionaire", en: "Millionaire" },
    description: { ru: "Подтверждает статус миллионера BAYHAN.", uz: "BAYHAN millioneri maqomini tasdiqlaydi.", en: "Shows your BAYHAN millionaire status." },
  }),
  item({
    id: "badge_legend", category: "badge", rarity: "legendary", priceUsd: 250_000, preview: "badge-star",
    name: { ru: "Legend", uz: "Legend", en: "Legend" },
    description: { ru: "Легендарный знак опытного игрока.", uz: "Tajribali o'yinchining afsonaviy belgisi.", en: "A legendary mark of experience." },
  }),
  item({
    id: "badge_top10", category: "badge", rarity: "legendary", priceUsd: 0, preview: "badge-trophy", purchasable: false,
    name: { ru: "TOP 10", uz: "TOP 10", en: "TOP 10" },
    description: { ru: "Выдаётся игрокам из десятки лучших.", uz: "Eng yaxshi o'ntalikdagi o'yinchilarga beriladi.", en: "Awarded to top-10 players." },
  }),
  item({
    id: "badge_space_explorer", category: "badge", rarity: "legendary", priceUsd: 0, preview: "badge-rocket", purchasable: false,
    name: { ru: "Space Explorer", uz: "Space Explorer", en: "Space Explorer" },
    description: { ru: "Награда за особое достижение.", uz: "Maxsus yutuq uchun mukofot.", en: "Reward for a special achievement." },
  }),
  // Themes
  item({
    id: "theme_dark", category: "theme", rarity: "common", priceUsd: 8_000, preview: "theme-carbon",
    name: { ru: "Carbon", uz: "Carbon", en: "Carbon" },
    description: { ru: "Строгий карбоновый фон профиля.", uz: "Qat'iy karbon profil foni.", en: "A strict carbon profile background." },
  }),
  item({
    id: "theme_cyberpunk", category: "theme", rarity: "rare", priceUsd: 30_000, preview: "theme-grid",
    name: { ru: "Cyber Grid", uz: "Cyber Grid", en: "Cyber Grid" },
    description: { ru: "Перспективная сетка с синим горизонтом.", uz: "Ko'k ufqli perspektiv to'r.", en: "A perspective grid with a blue horizon." },
  }),
  item({
    id: "theme_space", category: "theme", rarity: "epic", priceUsd: 55_000, preview: "theme-stars",
    name: { ru: "Deep Space", uz: "Deep Space", en: "Deep Space" },
    description: { ru: "Звёздное поле и мягкая туманность.", uz: "Yulduzli maydon va yumshoq tumanlik.", en: "A star field with a soft nebula." },
  }),
  item({
    id: "theme_matrix", category: "theme", rarity: "epic", priceUsd: 50_000, preview: "theme-circuit",
    name: { ru: "Circuit", uz: "Circuit", en: "Circuit" },
    description: { ru: "Схема печатной платы в фирменных цветах.", uz: "Brend ranglaridagi plata sxemasi.", en: "A circuit board in brand colors." },
  }),
  item({
    id: "theme_bayhan_black", category: "theme", rarity: "legendary", priceUsd: 400_000, preview: "theme-aurora", featured: true,
    name: { ru: "BAYHAN Aurora", uz: "BAYHAN Aurora", en: "BAYHAN Aurora" },
    description: { ru: "Фирменное синее сияние BAYHAN STUDIO.", uz: "BAYHAN STUDIO ning brend ko'k yog'dusi.", en: "The signature BAYHAN STUDIO blue aurora." },
  }),
  // Nickname styles
  item({
    id: "ns_brackets", category: "name_style", rarity: "common", priceUsd: 5_000, preview: "ns-brackets",
    name: { ru: "Brackets", uz: "Brackets", en: "Brackets" },
    description: { ru: "Ник в элегантных скобках 『 』.", uz: "Nik nafis 『 』 qavslarda.", en: "Your name in elegant 『 』 brackets." },
  }),
  item({
    id: "ns_diamond", category: "name_style", rarity: "rare", priceUsd: 15_000, preview: "ns-diamond",
    name: { ru: "Diamond Wrap", uz: "Diamond Wrap", en: "Diamond Wrap" },
    description: { ru: "Ник между двумя ромбами ◆.", uz: "Nik ikki romb ◆ orasida.", en: "Your name between two ◆ diamonds." },
  }),
  item({
    id: "ns_bayhan", category: "name_style", rarity: "epic", priceUsd: 35_000, preview: "ns-bayhan",
    name: { ru: "BAYHAN Tag", uz: "BAYHAN Tag", en: "BAYHAN Tag" },
    description: { ru: "Префикс BAYHAN перед ником.", uz: "Nik oldidan BAYHAN prefiksi.", en: "BAYHAN prefix before your name." },
  }),
  item({
    id: "ns_glow", category: "name_style", rarity: "legendary", priceUsd: 150_000, preview: "ns-glow",
    name: { ru: "Electric Glow", uz: "Electric Glow", en: "Electric Glow" },
    description: { ru: "Бело-синий градиент с мягким свечением.", uz: "Yumshoq yorqinlikli oq-ko'k gradient.", en: "White-blue gradient with a soft glow." },
  }),
  // Animated avatars
  item({
    id: "fx_pulse", category: "avatar_effect", rarity: "rare", priceUsd: 30_000, preview: "fx-pulse",
    name: { ru: "Pulse", uz: "Pulse", en: "Pulse" },
    description: { ru: "Аватар пульсирует мягкими волнами.", uz: "Avatar yumshoq to'lqinlar bilan pulslanadi.", en: "Your avatar pulses with soft waves." },
  }),
  item({
    id: "fx_scan", category: "avatar_effect", rarity: "epic", priceUsd: 70_000, preview: "fx-scan",
    name: { ru: "Scanline", uz: "Scanline", en: "Scanline" },
    description: { ru: "По аватару проходит луч сканера.", uz: "Avatar bo'ylab skaner nuri o'tadi.", en: "A scanner beam sweeps across your avatar." },
  }),
  item({
    id: "fx_orbit", category: "avatar_effect", rarity: "legendary", priceUsd: 220_000, preview: "fx-orbit", featured: true,
    name: { ru: "Orbit", uz: "Orbit", en: "Orbit" },
    description: { ru: "Вокруг аватара вращается спутник.", uz: "Avatar atrofida sun'iy yo'ldosh aylanadi.", en: "A satellite orbits your avatar." },
  }),
  item({
    id: "fx_limited_spark", category: "avatar_effect", rarity: "limited", priceUsd: 750_000, preview: "fx-spark",
    limitedQuantity: 250, soldCount: 211,
    name: { ru: "Origin Spark", uz: "Origin Spark", en: "Origin Spark" },
    description: { ru: "Искры первого сезона. Тираж 250 копий.", uz: "Birinchi mavsum uchqunlari. 250 nusxa.", en: "First-season sparks. 250 copies only." },
  }),
];

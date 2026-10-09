import type { TaskIcon, TaskPeriod } from "@/types/game";
import type { LocalizedText } from "./catalog";

export interface DemoTask {
  id: string;
  period: TaskPeriod;
  icon: TaskIcon;
  title: LocalizedText;
  description: LocalizedText;
  target: number;
  progress: number;
  rewardUsd: number;
  rewardXp: number;
  claimed: boolean;
}

/** Daily tasks mirror DEFAULT_QUESTS in bot/services/settings_service.py (targets and rewards). */
export const DEMO_TASKS: DemoTask[] = [
  {
    id: "daily_play_games", period: "daily", icon: "gamepad", target: 5, progress: 5, rewardUsd: 1_000, rewardXp: 20, claimed: false,
    title: { ru: "Сыграйте 5 игр", uz: "5 ta o'yin o'ynang", en: "Play 5 games" },
    description: { ru: "Любые режимы засчитываются.", uz: "Istalgan rejim hisoblanadi.", en: "Any mode counts." },
  },
  {
    id: "daily_win_games", period: "daily", icon: "trophy", target: 3, progress: 2, rewardUsd: 2_500, rewardXp: 30, claimed: false,
    title: { ru: "Выиграйте 3 игры", uz: "3 ta o'yinda g'alaba qozoning", en: "Win 3 games" },
    description: { ru: "Победы в любых играх.", uz: "Istalgan o'yindagi g'alabalar.", en: "Wins in any game." },
  },
  {
    id: "daily_mine_resources", period: "daily", icon: "pickaxe", target: 10, progress: 10, rewardUsd: 1_500, rewardXp: 15, claimed: true,
    title: { ru: "Добудьте 10 ресурсов", uz: "10 ta resurs qazib oling", en: "Mine 10 resources" },
    description: { ru: "Добыча в разделе ресурсов бота.", uz: "Botning resurslar bo'limida qazib olish.", en: "Mining in the bot's resources section." },
  },
  {
    id: "daily_earn_usd", period: "daily", icon: "coins", target: 10_000, progress: 6_400, rewardUsd: 3_000, rewardXp: 25, claimed: false,
    title: { ru: "Заработайте $10 000", uz: "$10 000 ishlab oling", en: "Earn $10,000" },
    description: { ru: "Сумма выигрышей за день.", uz: "Kunlik yutuqlar yig'indisi.", en: "Total winnings for the day." },
  },
  {
    id: "weekly_play_50", period: "weekly", icon: "flame", target: 50, progress: 31, rewardUsd: 15_000, rewardXp: 120, claimed: false,
    title: { ru: "Сыграйте 50 игр за неделю", uz: "Hafta davomida 50 ta o'yin", en: "Play 50 games this week" },
    description: { ru: "Прогресс сбрасывается в понедельник.", uz: "Natija dushanba kuni yangilanadi.", en: "Progress resets on Monday." },
  },
  {
    id: "weekly_invite", period: "weekly", icon: "users", target: 1, progress: 0, rewardUsd: 5_000, rewardXp: 50, claimed: false,
    title: { ru: "Пригласите друга", uz: "Do'stingizni taklif qiling", en: "Invite a friend" },
    description: { ru: "По вашей реферальной ссылке из бота.", uz: "Botdagi referal havolangiz orqali.", en: "Using your referral link from the bot." },
  },
  {
    id: "weekly_mines_streak", period: "weekly", icon: "target", target: 5, progress: 5, rewardUsd: 8_000, rewardXp: 80, claimed: false,
    title: { ru: "Заберите выигрыш в Mines 5 раз", uz: "Mines'da 5 marta yutuqni oling", en: "Cash out in Mines 5 times" },
    description: { ru: "Только успешные выводы.", uz: "Faqat muvaffaqiyatli yechishlar.", en: "Successful cash-outs only." },
  },
  {
    id: "ach_first_win", period: "achievement", icon: "trophy", target: 1, progress: 1, rewardUsd: 2_000, rewardXp: 50, claimed: true,
    title: { ru: "Первая победа", uz: "Birinchi g'alaba", en: "First win" },
    description: { ru: "Выиграйте свою первую игру.", uz: "Birinchi o'yiningizda g'alaba qozoning.", en: "Win your very first game." },
  },
  {
    id: "ach_collector", period: "achievement", icon: "bag", target: 5, progress: 3, rewardUsd: 20_000, rewardXp: 150, claimed: false,
    title: { ru: "Коллекционер", uz: "Kolleksioner", en: "Collector" },
    description: { ru: "Соберите 5 предметов BAYHAN STORE.", uz: "BAYHAN STORE dan 5 ta buyum to'plang.", en: "Collect 5 BAYHAN STORE items." },
  },
  {
    id: "ach_millionaire", period: "achievement", icon: "crown", target: 1_000_000, progress: 284_350, rewardUsd: 50_000, rewardXp: 400, claimed: false,
    title: { ru: "Миллионер", uz: "Millioner", en: "Millionaire" },
    description: { ru: "Накопите капитал $1 000 000.", uz: "$1 000 000 kapital to'plang.", en: "Reach $1,000,000 in capital." },
  },
];

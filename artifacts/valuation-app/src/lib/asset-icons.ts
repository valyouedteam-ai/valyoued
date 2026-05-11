import {
  Watch,
  Car,
  Wine,
  Gem,
  ShoppingBag,
  Briefcase,
  Home,
  Plane,
  Ship,
  Music,
  Camera,
  Paintbrush,
  BookOpen,
  Cpu,
  Bike,
  Sparkles,
  Trophy,
  Coins,
  type LucideIcon,
} from "lucide-react";

// Order matters: more specific rules first so that a term like "smartphone" matches
// the tech rule before the (word-bounded) art rule. All rules use \b word
// boundaries to avoid substring false positives like "art" hitting "smartphone".
const RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /\b(watch|watches|smartwatch|wristwatch|horolog\w*)\b/i, icon: Watch },
  { match: /\b(car|cars|vehicle|auto|automobile|mini|cooper|porsche|ferrari|bmw|mercedes)\b/i, icon: Car },
  { match: /\b(wine|wines|whisky|whiskey|bourbon|spirits?|champagne|burgundy|bordeaux)\b/i, icon: Wine },
  { match: /\b(jewel\w*|gem|gems|diamond|ring|necklace|earring)\b/i, icon: Gem },
  { match: /\b(bag|bags|hermes|handbag|birkin|kelly|purse)\b/i, icon: ShoppingBag },
  { match: /\b(real\s*estate|propert\w*|apartment|house|home|condo|villa)\b/i, icon: Home },
  { match: /\b(aircraft|plane|cessna|aviation|jet)\b/i, icon: Plane },
  { match: /\b(boat|yacht|ship|marine|sailboat)\b/i, icon: Ship },
  { match: /\b(instrument|guitar|piano|violin|music|cello|drum)\b/i, icon: Music },
  { match: /\b(camera|leica|hasselblad|photo|lens)\b/i, icon: Camera },
  { match: /\b(electron\w*|tech|computer|laptop|console|gaming|smartphone|phone|mobile|tablet|gpu)\b/i, icon: Cpu },
  { match: /\b(bike|bicycle|motorcycle|moped|scooter)\b/i, icon: Bike },
  { match: /\b(sneaker\w*|shoe|shoes|streetwear|fashion|clothing|apparel)\b/i, icon: ShoppingBag },
  { match: /\b(trading\s*card|pokemon|mtg|baseball|tcg)\b/i, icon: Trophy },
  { match: /\b(coin|coins|bullion|gold|silver|metal|precious\s*metal)\b/i, icon: Coins },
  { match: /\b(book|books|comic|comics|manuscript|first\s*edition)\b/i, icon: BookOpen },
  { match: /\b(art|artwork|painting|sculpture|print)\b/i, icon: Paintbrush },
];

export function iconForAssetType(name: string | undefined): LucideIcon {
  if (!name) return Sparkles;
  for (const rule of RULES) {
    if (rule.match.test(name)) return rule.icon;
  }
  return Briefcase;
}

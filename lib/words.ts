import data from "@/public/words.json";

export type WordPick = { word: string; category: string };

const dict = data as Record<string, string[]>;

export function pickWord(): WordPick {
  const categories = Object.keys(dict);
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const list = dict[cat];
  const word = list[Math.floor(Math.random() * list.length)];
  return { word, category: cat };
}

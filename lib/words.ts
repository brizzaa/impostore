import words from "@/public/words.json";

export function pickWord(): string {
  const list = words as string[];
  return list[Math.floor(Math.random() * list.length)];
}

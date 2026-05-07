export interface MealOption {
  label: string;
  desc: string;
  kcal: number;
  pr: number;
  c: number;
  g: number;
}

export interface Meal {
  name: string;
  options: MealOption[];
}

export const MEALS: Meal[] = [
  {
    name: 'COLAZIONE',
    options: [
      { label: 'OPZ. A', desc: '250g albume · 80g avena · banana · BA · miele', kcal: 520, pr: 42, c: 68, g: 12 },
      { label: 'OPZ. B', desc: '70g cereali · 30g whey · 200g latte · BA', kcal: 480, pr: 38, c: 65, g: 13 },
    ],
  },
  {
    name: 'MERENDA',
    options: [
      { label: 'OPZ. A', desc: '1 banana + 25g whey', kcal: 195, pr: 19, c: 29, g: 1 },
      { label: 'OPZ. B', desc: '15g noccioline + 25g whey', kcal: 185, pr: 21, c: 4, g: 10 },
    ],
  },
  {
    name: 'PRANZO',
    options: [
      { label: 'RISO + PROTEINA', desc: '80g riso · 150g proteina cruda · verdure', kcal: 620, pr: 58, c: 74, g: 18 },
    ],
  },
  {
    name: 'CENA',
    options: [
      { label: 'PROTEINA + INSALATA', desc: '150g proteina cruda + insalata', kcal: 460, pr: 52, c: 38, g: 14 },
    ],
  },
];

export function getMealTotals(mealSelected: (string | null)[]) {
  let kcal = 0, pr = 0, c = 0, g = 0;
  mealSelected.forEach((sel, i) => {
    if (sel === null || !MEALS[i]) return;
    const opt = MEALS[i].options[Number(sel)];
    if (!opt) return;
    kcal += opt.kcal; pr += opt.pr; c += opt.c; g += opt.g;
  });
  return { kcal, pr, c, g };
}

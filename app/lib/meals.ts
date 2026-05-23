export interface MealOption {
  label: string;     // titolo grande (es. "Riso e pollo")
  desc: string;      // dettaglio piccolo (es. "80g riso + 150g pollo + verdure")
  kcal: number;
  pr: number;
  c: number;
  g: number;
}

export interface Meal {
  name: string;
  options: MealOption[];
}

const SNACKS: MealOption[] = [
  { label: 'Banana + whey',     desc: '1 banana + 25g whey',       kcal: 210, pr: 21, c: 29, g: 2  },
  { label: 'Noccioline + whey', desc: '15g noccioline + 25g whey', kcal: 190, pr: 24, c: 5,  g: 9  },
];

// 4 pasti, decisione 2026-05-23:
//  - Colazione: yogurt+granola e albumi+avena rimosse (Aaron non le fa più)
//  - Merenda: 1 sola (mattina + pomeriggio unificate) con multi-select
//    (può spuntare entrambe le opzioni nello stesso giorno)
//  - Pranzo / Cena: invariate
export const MEALS: Meal[] = [
  {
    name: 'COLAZIONE',
    options: [
      { label: 'Cereali',          desc: '70g cereali Kellogs Extra + 30g whey + 200g latte p.scremato + 15g BA', kcal: 580, pr: 42, c: 64, g: 17 },
      { label: 'Pancake proteico', desc: '80g avena + 25g whey + 250g albume + cannella',                          kcal: 525, pr: 58, c: 58, g: 8  },
    ],
  },
  {
    name: 'MERENDA',
    options: SNACKS,
  },
  {
    name: 'PRANZO',
    options: [
      { label: 'Riso e pollo',         desc: '80g riso + 150g pollo + verdure',          kcal: 505, pr: 43, c: 72, g: 4  },
      { label: 'Riso e tacchino',      desc: '80g riso + 150g macinata tacchino + verdure', kcal: 490, pr: 39, c: 72, g: 4  },
      { label: 'Riso e salmone',       desc: '80g riso + 150g salmone + verdure',        kcal: 655, pr: 38, c: 72, g: 22 },
      { label: 'Riso e macinata',      desc: '80g riso + 150g macinata scelta + verdure', kcal: 565, pr: 38, c: 72, g: 12 },
      { label: 'Couscous e pollo',     desc: '80g couscous + 150g pollo + verdure',      kcal: 495, pr: 46, c: 66, g: 5  },
      { label: 'Couscous e tacchino',  desc: '80g couscous + 150g macinata tacchino + verdure', kcal: 480, pr: 42, c: 66, g: 4  },
      { label: 'Couscous e salmone',   desc: '80g couscous + 150g salmone + verdure',    kcal: 645, pr: 41, c: 66, g: 22 },
      { label: 'Couscous e macinata',  desc: '80g couscous + 150g macinata scelta + verdure', kcal: 555, pr: 41, c: 66, g: 12 },
    ],
  },
  {
    name: 'CENA',
    options: [
      { label: 'Pollo + insalata',     desc: '150g pollo + insalata',                 kcal: 195, pr: 36, c: 5, g: 4  },
      { label: 'Tacchino + insalata',  desc: '150g macinata tacchino + insalata',     kcal: 180, pr: 32, c: 5, g: 3  },
      { label: 'Salmone + insalata',   desc: '150g salmone + insalata',               kcal: 345, pr: 31, c: 5, g: 22 },
      { label: 'Macinata + insalata',  desc: '150g macinata scelta + insalata',       kcal: 255, pr: 31, c: 5, g: 12 },
    ],
  },
];

// L'indice del pasto "MERENDA" nell'array MEALS — utile alle UI per sapere
// quando applicare multi-select invece di single-select.
export const MEAL_IDX_MERENDA = 1;

// mealSelected è ora un array di array (string[]|null per riga).
// Una riga `null` = niente selezionato. Un array di N indici = N opzioni
// scelte (per i pasti single-select, l'array conterrà sempre 1 elemento).
export function getMealTotals(mealSelected: (string[] | null)[]) {
  let kcal = 0, pr = 0, c = 0, g = 0;
  mealSelected.forEach((sel, i) => {
    if (sel === null || !MEALS[i]) return;
    for (const idxStr of sel) {
      const opt = MEALS[i].options[Number(idxStr)];
      if (!opt) continue;
      kcal += opt.kcal; pr += opt.pr; c += opt.c; g += opt.g;
    }
  });
  return { kcal, pr, c, g };
}

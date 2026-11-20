// Офлайн-база популярных продуктов РФ. Значения на 100 г (в готовом/сухом виде — указано в названии).

export type FoodCategory = 'meat' | 'fish' | 'dairy' | 'grain' | 'veg' | 'fruit' | 'fat' | 'other';

export interface Food {
  id: string;
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  cat: FoodCategory;
  /** Типичная порция, г */
  portion?: number;
  /** Сложные углеводы — для рефида и до-тренировочного окна */
  complex?: boolean;
  custom?: boolean;
}

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  meat: 'Мясо и птица',
  fish: 'Рыба',
  dairy: 'Молочное и яйца',
  grain: 'Крупы и гарниры',
  veg: 'Овощи',
  fruit: 'Фрукты и ягоды',
  fat: 'Жиры и орехи',
  other: 'Прочее',
};

const f = (
  id: string,
  name: string,
  kcal: number,
  p: number,
  fat: number,
  c: number,
  cat: FoodCategory,
  portion?: number,
  complex?: boolean,
): Food => ({ id, name, kcal, p, f: fat, c, cat, portion, complex });

export const FOODS: Food[] = [
  // Мясо и птица
  f('chicken-breast', 'Куриная грудка (сырая)', 113, 23.6, 1.9, 0.4, 'meat', 200),
  f('chicken-breast-cooked', 'Куриная грудка отварная', 137, 29.8, 1.8, 0.5, 'meat', 150),
  f('chicken-thigh', 'Куриное бедро без кожи (сырое)', 130, 19.5, 5.7, 0, 'meat', 200),
  f('turkey-breast', 'Филе индейки (сырое)', 115, 24, 2, 0, 'meat', 200),
  f('turkey-mince', 'Фарш индейки', 160, 18, 10, 0, 'meat', 200),
  f('beef-lean', 'Говядина постная (вырезка)', 158, 22, 7.1, 0, 'meat', 200),
  f('beef-mince', 'Фарш говяжий 15%', 215, 18, 15, 0, 'meat', 150),
  f('pork-lean', 'Свинина постная (корейка)', 172, 20, 10, 0, 'meat', 150),
  f('chicken-liver', 'Печень куриная', 137, 20.4, 5.9, 0.7, 'meat', 150),
  // Рыба
  f('salmon', 'Лосось (сёмга)', 208, 20, 13.4, 0, 'fish', 150),
  f('tuna-can', 'Тунец в собственном соку', 96, 21, 1, 0, 'fish', 150),
  f('pollock', 'Минтай', 72, 15.9, 0.9, 0, 'fish', 200),
  f('cod', 'Треска', 78, 17.7, 0.7, 0, 'fish', 200),
  f('shrimp', 'Креветки варёные', 95, 20, 1.5, 0, 'fish', 150),
  f('pink-salmon', 'Горбуша', 140, 20.5, 6.5, 0, 'fish', 150),
  // Молочное и яйца
  f('egg', 'Яйцо куриное (1 шт ≈ 55 г)', 157, 12.7, 11.5, 0.7, 'dairy', 55),
  f('egg-white', 'Яичный белок', 48, 11.1, 0, 0, 'dairy', 100),
  f('cottage-0', 'Творог 0%', 71, 16.5, 0, 1.3, 'dairy', 200),
  f('cottage-2', 'Творог 2%', 103, 18, 2, 3.3, 'dairy', 200),
  f('cottage-5', 'Творог 5%', 121, 17.2, 5, 1.8, 'dairy', 200),
  f('greek-yogurt', 'Греческий йогурт 2%', 66, 8, 2, 3.8, 'dairy', 150),
  f('kefir-1', 'Кефир 1%', 40, 3, 1, 4, 'dairy', 250),
  f('milk-25', 'Молоко 2.5%', 52, 2.8, 2.5, 4.7, 'dairy', 250),
  f('cheese', 'Сыр твёрдый 45%', 356, 25, 28, 0, 'dairy', 30),
  f('mozzarella-light', 'Моцарелла лайт', 160, 22, 8, 1, 'dairy', 50),
  f('whey', 'Сывороточный протеин', 380, 78, 6, 7, 'dairy', 30),
  f('casein', 'Казеин', 360, 80, 2, 6, 'dairy', 30),
  // Крупы и гарниры (сухой вес, если не указано)
  f('buckwheat', 'Гречка (сухая)', 313, 12.6, 3.3, 62.1, 'grain', 80, true),
  f('buckwheat-cooked', 'Гречка варёная', 101, 4.2, 1.1, 18.6, 'grain', 200, true),
  f('basmati', 'Рис басмати (сухой)', 349, 8, 0.8, 76, 'grain', 80, true),
  f('rice-white', 'Рис белый (сухой)', 344, 6.7, 0.7, 78.9, 'grain', 80, true),
  f('rice-cooked', 'Рис белый варёный', 116, 2.2, 0.5, 24.9, 'grain', 200, true),
  f('oats', 'Овсянка (хлопья)', 352, 12.3, 6.1, 59.5, 'grain', 60, true),
  f('pasta', 'Макароны тв. сортов (сухие)', 344, 11, 1.3, 71.5, 'grain', 80, true),
  f('potato', 'Картофель', 77, 2, 0.4, 16.3, 'grain', 250, true),
  f('sweet-potato', 'Батат', 86, 1.6, 0.1, 20, 'grain', 200, true),
  f('bulgur', 'Булгур (сухой)', 342, 12.3, 1.3, 63.4, 'grain', 80, true),
  f('bread-rye', 'Хлеб ржаной', 210, 6.7, 1.2, 42, 'grain', 40, true),
  f('bread-whole', 'Хлеб цельнозерновой', 245, 9, 3.5, 43, 'grain', 40, true),
  f('lavash', 'Лаваш тонкий', 277, 9.1, 1.1, 56, 'grain', 60, true),
  f('rice-cakes', 'Хлебцы рисовые', 380, 8, 3, 79, 'grain', 20, true),
  // Овощи
  f('cucumber', 'Огурец', 15, 0.8, 0.1, 2.8, 'veg', 150),
  f('tomato', 'Помидор', 20, 1.1, 0.2, 3.7, 'veg', 150),
  f('broccoli', 'Брокколи', 34, 2.8, 0.4, 6.6, 'veg', 200),
  f('cabbage', 'Капуста белокочанная', 27, 1.8, 0.1, 4.7, 'veg', 200),
  f('carrot', 'Морковь', 35, 1.3, 0.1, 6.9, 'veg', 100),
  f('pepper', 'Перец болгарский', 27, 1.3, 0, 5.3, 'veg', 150),
  f('veg-mix', 'Овощная смесь замороженная', 40, 2, 0.3, 7, 'veg', 200),
  f('green-peas', 'Зелёный горошек', 73, 5, 0.2, 13.3, 'veg', 100),
  // Фрукты
  f('banana', 'Банан', 96, 1.5, 0.2, 21.8, 'fruit', 120),
  f('apple', 'Яблоко', 47, 0.4, 0.4, 9.8, 'fruit', 180),
  f('orange', 'Апельсин', 43, 0.9, 0.2, 8.1, 'fruit', 180),
  f('blueberry', 'Черника / голубика', 44, 1.1, 0.4, 7.6, 'fruit', 100),
  f('pear', 'Груша', 47, 0.4, 0.3, 10.3, 'fruit', 180),
  f('dates', 'Финики сушёные', 282, 2.5, 0.4, 69, 'fruit', 30),
  // Жиры и орехи
  f('olive-oil', 'Масло оливковое', 898, 0, 99.8, 0, 'fat', 10),
  f('sunflower-oil', 'Масло подсолнечное', 899, 0, 99.9, 0, 'fat', 10),
  f('butter', 'Масло сливочное 82%', 748, 0.5, 82.5, 0.8, 'fat', 10),
  f('almond', 'Миндаль', 609, 18.6, 53.7, 13, 'fat', 30),
  f('walnut', 'Грецкий орех', 654, 16.2, 60.8, 11.1, 'fat', 30),
  f('peanut-butter', 'Арахисовая паста', 588, 25, 50, 15, 'fat', 20),
  f('avocado', 'Авокадо', 160, 2, 14.7, 1.8, 'fat', 100),
  // Прочее
  f('honey', 'Мёд', 329, 0.8, 0, 80.3, 'other', 20),
  f('dark-chocolate', 'Шоколад горький 70%', 540, 7.8, 42.6, 33, 'other', 20),
  f('hummus', 'Хумус', 166, 7.9, 9.6, 14.3, 'other', 50),
  f('lentils', 'Чечевица (сухая)', 295, 24, 1.5, 46.3, 'other', 80, true),
];

export interface MealTemplateItem {
  foodId: string;
  grams: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: MealTemplateItem[];
  custom?: boolean;
}

export const DEFAULT_TEMPLATES: MealTemplate[] = [
  {
    id: 'tpl-chicken-rice',
    name: 'Курица + рис',
    items: [
      { foodId: 'chicken-breast', grams: 200 },
      { foodId: 'basmati', grams: 80 },
      { foodId: 'cucumber', grams: 150 },
    ],
  },
  {
    id: 'tpl-cottage-night',
    name: 'Творог на ночь',
    items: [
      { foodId: 'cottage-2', grams: 250 },
      { foodId: 'walnut', grams: 15 },
    ],
  },
  {
    id: 'tpl-oats-whey',
    name: 'Овсянка + протеин',
    items: [
      { foodId: 'oats', grams: 70 },
      { foodId: 'whey', grams: 30 },
      { foodId: 'banana', grams: 120 },
    ],
  },
  {
    id: 'tpl-pre-gym',
    name: 'Перед залом: гречка + индейка',
    items: [
      { foodId: 'buckwheat', grams: 80 },
      { foodId: 'turkey-breast', grams: 150 },
    ],
  },
  {
    id: 'tpl-eggs',
    name: 'Омлет 2+3 белка',
    items: [
      { foodId: 'egg', grams: 110 },
      { foodId: 'egg-white', grams: 100 },
      { foodId: 'bread-rye', grams: 40 },
    ],
  },
];

export interface Macros {
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export const ZERO: Macros = { kcal: 0, p: 0, f: 0, c: 0 };

export function macrosFor(food: Pick<Food, 'kcal' | 'p' | 'f' | 'c'>, grams: number): Macros {
  const k = grams / 100;
  return { kcal: food.kcal * k, p: food.p * k, f: food.f * k, c: food.c * k };
}

export const sumMacros = (list: Macros[]): Macros =>
  list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c }), ZERO);

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

export function searchFoods(list: Food[], q: string): Food[] {
  const n = norm(q);
  if (!n) return list;
  const words = n.split(/\s+/);
  return list
    .filter((x) => {
      const name = norm(x.name);
      return words.every((w) => name.includes(w));
    })
    .sort((a, b) => Number(norm(b.name).startsWith(n)) - Number(norm(a.name).startsWith(n)));
}

/**
 * Utility to convert numbers to Bengali and English currency words (Bangladeshi Taka)
 */

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliNumber(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

const onesBn: { [key: number]: string } = {
  0: "শূন্য",
  1: "এক",
  2: "দুই",
  3: "তিন",
  4: "চার",
  5: "পাঁচ",
  6: "ছয়",
  7: "সাত",
  8: "আট",
  9: "নয়",
  10: "দশ",
  11: "এগারো",
  12: "বারো",
  13: "তেরো",
  14: "চৌদ্দ",
  15: "পনেরো",
  16: "ষোলো",
  17: "সতেরো",
  18: "আঠারো",
  19: "উনিশ",
  20: "বিশ",
  21: "একুশ",
  22: "বাইশ",
  23: "তেইশ",
  24: "চব্বিশ",
  25: "পঁচিশ",
  26: "ছাব্বিশ",
  27: "সাতাশ",
  28: "আঠাশ",
  29: "উনত্রিশ",
  30: "ত্রিশ",
  31: "একত্রিশ",
  32: "বত্রিশ",
  33: "তেত্রিশ",
  34: "চৌত্রিশ",
  35: "পঁয়ত্রিশ",
  36: "ছত্রিশ",
  37: "সাঁইত্রিশ",
  38: "আটত্রিশ",
  39: "উনচল্লিশ",
  40: "চল্লিশ",
  41: "একচল্লিশ",
  42: "বিয়াল্লিশ",
  43: "তেতাল্লিশ",
  44: "চুয়াল্লিশ",
  45: "পঁয়তাল্লিশ",
  46: "ছেচল্লিশ",
  47: "সাতচল্লিশ",
  48: "আটচল্লিশ",
  49: "উনপঞ্চাশ",
  50: "পঞ্চাশ",
  51: "একান্ন",
  52: "বায়ান্ন",
  53: "তিপ্পান্ন",
  54: "চুয়ান্ন",
  55: "পঞ্চান্ন",
  56: "ছাপ্পান্ন",
  57: "সাতান্ন",
  58: "আটান্ন",
  59: "উনষাট",
  60: "ষাট",
  61: "একষট্টি",
  62: "বাষট্টি",
  63: "তেষট্টি",
  64: "চৌষট্টি",
  65: "পঁয়ষট্টি",
  66: "ছেষট্টি",
  67: "সাতষট্টি",
  68: "আটষট্টি",
  69: "উনসত্তর",
  70: "সত্তর",
  71: "একাত্তর",
  72: "বাহাত্তর",
  73: "তিয়াত্তর",
  74: "চুয়াত্তর",
  75: "পঁচাত্তর",
  76: "ছিয়াত্তর",
  77: "সাতাত্তর",
  78: "আটাত্তর",
  79: "উনাশি",
  80: "আশি",
  81: "একাশি",
  82: "বিরাশি",
  83: "তিরাশি",
  84: "চুরাশি",
  85: "পঁচাশি",
  86: "ছিয়াশি",
  87: "সাতাশি",
  88: "অষ্টআশি",
  89: "ঊননব্বই",
  90: "নব্বই",
  91: "একানব্বই",
  92: "বিরানব্বই",
  93: "তিরানব্বই",
  94: "চুরানব্বই",
  95: "পঁচানব্বই",
  96: "ছিয়ানব্বই",
  97: "সাতানব্বই",
  98: "আটানব্বই",
  99: "নিরানব্বই",
};

export function numberToBengaliWords(num: number): string {
  if (isNaN(num) || num <= 0) return "শূন্য টাকা মাত্র";
  const intVal = Math.floor(num);

  const parts: string[] = [];

  // Crores (কোটি)
  const crore = Math.floor(intVal / 10000000);
  const remCrore = intVal % 10000000;
  if (crore > 0) {
    parts.push(`${numberToBengaliWordsSimple(crore)} কোটি`);
  }

  // Lakhs (লক্ষ)
  const lakh = Math.floor(remCrore / 100000);
  const remLakh = remCrore % 100000;
  if (lakh > 0) {
    parts.push(`${numberToBengaliWordsSimple(lakh)} লক্ষ`);
  }

  // Thousands (হাজার)
  const thousand = Math.floor(remLakh / 1000);
  const remThousand = remLakh % 1000;
  if (thousand > 0) {
    parts.push(`${numberToBengaliWordsSimple(thousand)} হাজার`);
  }

  // Hundreds (শত)
  const hundred = Math.floor(remThousand / 100);
  const remHundred = remThousand % 100;
  if (hundred > 0) {
    parts.push(`${onesBn[hundred]} শত`);
  }

  // Tens & Ones
  if (remHundred > 0) {
    parts.push(onesBn[remHundred] || String(remHundred));
  }

  return `${parts.join(" ")} টাকা মাত্র`;
}

function numberToBengaliWordsSimple(num: number): string {
  if (num <= 0) return "";
  if (num < 100) return onesBn[num] || String(num);
  const h = Math.floor(num / 100);
  const r = num % 100;
  let str = "";
  if (h > 0) str += `${onesBn[h]} শত `;
  if (r > 0) str += onesBn[r] || String(r);
  return str.trim();
}

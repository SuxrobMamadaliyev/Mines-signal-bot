/**
 * Mines signal generator
 * Generates safe/danger cell predictions for a 5x5 grid
 */
function generateSignal(selectedCells) {
  const total = 25;
  const allCells = Array.from({ length: total }, (_, i) => i);

  // Randomly assign safe and danger from selected cells
  const shuffled = [...selectedCells].sort(() => Math.random() - 0.5);
  const safeCount = Math.max(1, Math.floor(shuffled.length * 0.6));
  const safe = shuffled.slice(0, safeCount);
  const danger = shuffled.slice(safeCount);

  // Also add some unselected cells as danger (mines)
  const unselected = allCells.filter((i) => !selectedCells.includes(i));
  const extraDanger = unselected.sort(() => Math.random() - 0.5).slice(0, 3);
  const allDanger = [...danger, ...extraDanger];

  const accuracy = Math.floor(72 + Math.random() * 23); // 72–94%
  const strengths = ['⭐⭐⭐ Yuqori', '⭐⭐⭐⭐ Juda yuqori', '⭐⭐⭐⭐⭐ Maksimal'];
  const strength = strengths[Math.floor(Math.random() * strengths.length)];

  return { safe, danger: allDanger, accuracy, strength };
}

module.exports = { generateSignal };

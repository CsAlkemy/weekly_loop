export function niceScale(top: number, { integer = false } = {}) {
  const target = top > 0 ? top : 1;
  const rough = target / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  let step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
  if (integer) step = Math.max(1, Math.ceil(step));
  const max = Math.ceil(target / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  return { max, ticks };
}

export function roundedTop(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

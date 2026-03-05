const DC = {};

export async function loadData(name) {
  if (DC[name]) return DC[name];
  const r = await fetch(`/data/${name}.json`);
  DC[name] = await r.json();
  return DC[name];
}

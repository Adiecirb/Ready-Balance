export async function loadFoods() {
  const response = await fetch('../data/foods.json');
  return await response.json();
}
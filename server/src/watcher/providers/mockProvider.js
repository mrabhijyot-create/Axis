// Demo/testing provider — simulates the consulate calendar so the watcher's
// scheduling, matching, and notification logic can be exercised without
// hitting any real site. Never used for mode: "live".
export async function checkAvailability(consulateCity) {
  const hasSlot = Math.random() < 0.15; // occasional simulated opening, for demoing the alert path
  const slots = hasSlot ? [randomSlot()] : [];
  return { consulateCity, fetchedAt: new Date().toISOString(), slots, provider: "mock" };
}

function randomSlot() {
  const daysOut = 3 + Math.floor(Math.random() * 30);
  const date = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000);
  const hour = 9 + Math.floor(Math.random() * 7);
  return { date: date.toISOString().slice(0, 10), time: `${String(hour).padStart(2, "0")}:00` };
}

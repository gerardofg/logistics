// Logistics app entry point

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.querySelectorAll('.card .number')[0].textContent = data.shipments ?? 0;
    document.querySelectorAll('.card .number')[1].textContent = data.inTransit ?? 0;
    document.querySelectorAll('.card .number')[2].textContent = data.delivered ?? 0;
    document.querySelectorAll('.card .number')[3].textContent = data.pending ?? 0;
  } catch {
    // API not running — numbers stay at 0
  }
}

fetchStats();

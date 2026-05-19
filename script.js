// Ganti IP ini dengan IP ESP32 kamu nanti
const ESP32_IP = "http://192.168.4.1";

// Setup Chart
const ctx = document.getElementById('myChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Tegangan (V)',
        data: [],
        borderColor: '#00d4ff',
        backgroundColor: '#00d4ff22',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
      {
        label: 'Daya (W)',
        data: [],
        borderColor: '#00ff88',
        backgroundColor: '#00ff8822',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      }
    ]
  },
  options: {
    responsive: true,
    animation: { duration: 500 },
    plugins: {
      legend: {
        labels: { color: '#aaa', font: { size: 12 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#555', maxTicksLimit: 10 },
        grid: { color: '#ffffff10' }
      },
      y: {
        ticks: { color: '#555' },
        grid: { color: '#ffffff10' }
      }
    }
  }
});

// Maksimal data di chart
const MAX_DATA = 20;

function updateChart(volt, watt) {
  const now = new Date();
  const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(volt);
  chart.data.datasets[1].data.push(watt);

  if (chart.data.labels.length > MAX_DATA) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.shift();
  }

  chart.update();
}

function updateBadge(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'badge ' + type;
}

async function fetchData() {
  const dot = document.getElementById('statusDot');
  
  try {
    const res = await fetch(`${ESP32_IP}/data`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();

    dot.className = 'status-dot online';

    // Update nilai
    document.getElementById('tegangan').textContent = parseFloat(data.volt).toFixed(1);
    document.getElementById('daya').textContent = parseFloat(data.watt).toFixed(1);
    document.getElementById('kelembaban').textContent = data.soil;
    document.getElementById('posisi').textContent = data.posTracker;

    // Update chart
    updateChart(parseFloat(data.volt), parseFloat(data.watt));

    // Update soil bar
    document.getElementById('soilBar').style.width = data.soil + '%';
    document.getElementById('soilPct').textContent = data.soil + '%';

    // Update status pompa
    if (data.statusPompa === 'ON') {
      updateBadge('statusPompa', '💧 ON — Menyiram', 'on');
    } else {
      updateBadge('statusPompa', '⏸ OFF', 'off');
    }

    // Update status pembersih
    if (data.statusBersih === 'Berjalan...') {
      updateBadge('statusBersih', '🧹 Berjalan...', 'running');
    } else if (data.statusBersih === 'Selesai') {
      updateBadge('statusBersih', '✅ Selesai', 'on');
    } else {
      updateBadge('statusBersih', '⏸ Standby', 'off');
    }

    // Last update
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('id-ID');

  } catch (err) {
    dot.className = 'status-dot offline';
    console.log('ESP32 tidak terhubung:', err);
  }
}

// Fetch pertama langsung
fetchData();

async function nyalakanPembersih() {
  const btn = document.getElementById('btnBersih');
  const pesan = document.getElementById('pesanBersih');
  const badge = document.getElementById('statusBersih');
  
  btn.disabled = true;
  btn.textContent = '⏳ Berjalan...';
  pesan.textContent = 'Pembersih sedang berjalan...';
  badge.textContent = '🧹 Berjalan...';
  badge.className = 'badge running';
  
  try {
    await fetch(`${ESP32_IP}/bersih`);
    await new Promise(resolve => setTimeout(resolve, 15000));
    pesan.textContent = '✅ Pembersih selesai!';
    badge.textContent = '✅ Selesai';
    badge.className = 'badge on';
  } catch (err) {
    pesan.textContent = '❌ Gagal konek ke ESP32';
  }
  
  btn.disabled = false;
  btn.textContent = '🧹 Jalankan Pembersih';
}

// Auto refresh tiap 3 detik
setInterval(fetchData, 3000);

// script.js
// Live-simulated dashboard for:
// - Babies born (counter + live line chart)
// - Condom price (price + live chart with small random walk)
// - Number of women (total + line chart)
// Uses Chart.js (included via CDN in index.html)

// ------------------------ Configuration (tweak these) ------------------------
const birthsPerSecond = 4.3;              // simulated worldwide births per second
const initialCondomPrice = 0.8;           // starting $ price per condom
const condomVolatilityPerSecond = 0.005;  // typical fractional change per second (0.005 = 0.5%)
const initialWomen = 4.02e9;              // initial women count
const womenAnnualGrowthRate = 0.008;      // 0.8% annual growth (approx) -> adjust if you want
const secondsWindow = 60;                 // how many seconds to display on the charts

// ---------------------------------------------------------------------------
// Helper
function formatNumber(n){
  if (n >= 1e9) return (n/1e9).toFixed(2) + ' B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + ' M';
  if (n >= 1e3) return (n/1e3).toFixed(0) + ' K';
  return Math.round(n).toString();
}
function formatCurrency(n){
  return '$' + n.toFixed(2);
}

// ------------------------ Initial runtime state ------------------------------
let babiesTotal = Math.round(birthsPerSecond * 0); // start at 0 or set to historical number
let condomPrice = initialCondomPrice;
let womenTotal = initialWomen;

let running = {
  babies: true,
  condoms: true,
  women: true
};

// computed women increase per second from annual rate
const womenPerSecond = (womenTotal * womenAnnualGrowthRate) / (365*24*3600);

// ------------------------ Setup charts --------------------------------------
function createLineChart(canvasId, label, color, initialData){
  const ctx = document.getElementById(canvasId).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: initialData.map(d => d.t),
      datasets: [{
        label: label,
        data: initialData.map(d => d.v),
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
        backgroundColor: color.background,
        borderColor: color.border
      }]
    },
    options: {
      animation: {duration: 0},
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#bcd' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (label.includes('Price')) return '$' + v.toFixed(2);
              if (label.includes('Women')) return Math.round(v).toLocaleString();
              return Math.round(v).toLocaleString();
            }
          }
        }
      }
    }
  });
  return chart;
}

// build initial arrays (secondsWindow points)
function buildInitialSeries(initialValue, transform = v => v){
  const arr = [];
  const now = new Date();
  for(let i = secondsWindow-1; i >= 0; i--){
    arr.push({
      t: new Date(now.getTime() - i*1000).toLocaleTimeString(),
      v: transform(initialValue)
    });
  }
  return arr;
}

// Babies chart & counter
const babiesInitial = buildInitialSeries(0);
const babiesChart = createLineChart('babies-chart','Babies / sec',{
  background: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.95)'
}, babiesInitial);
document.getElementById('babies-counter').textContent = formatNumber(babiesTotal);

// Condoms chart & counter
const condomsInitial = buildInitialSeries(initialCondomPrice);
const condomsChart = createLineChart('condoms-chart','Price (per condom)',{
  background: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.95)'
}, condomsInitial);
document.getElementById('condoms-counter').textContent = formatCurrency(condomPrice);

// Women chart & counter
const womenInitial = buildInitialSeries(womenTotal);
const womenChart = createLineChart('women-chart','Number of Women',{
  background: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.95)'
}, womenInitial);
document.getElementById('women-counter').textContent = formatNumber(womenTotal);

// ------------------------ Update loop ---------------------------------------
function tick(){
  const timeLabel = new Date().toLocaleTimeString();

  // --- Babies
  if (running.babies){
    // Add exact fractional births: accumulate fraction until >= 1 then increment counter
    // We'll simulate by adding birthsPerSecond every second (could be fractional)
    babiesTotal += birthsPerSecond;
    // Update counter (rounded)
    document.getElementById('babies-counter').textContent = formatNumber(Math.floor(babiesTotal));
    // push to chart
    pushPoint(babiesChart, timeLabel, Math.floor(babiesTotal));
  }

  // --- Condoms (random walk)
  if (running.condoms){
    // random multiplicative noise
    const shock = (Math.random() - 0.5) * condomVolatilityPerSecond * 2;
    condomPrice = Math.max(0.05, condomPrice * (1 + shock)); // never below $0.05
    document.getElementById('condoms-counter').textContent = formatCurrency(condomPrice);
    pushPoint(condomsChart, timeLabel, condomPrice);
  }

  // --- Women
  if (running.women){
    womenTotal += womenPerSecond;
    document.getElementById('women-counter').textContent = formatNumber(Math.floor(womenTotal));
    pushPoint(womenChart, timeLabel, Math.floor(womenTotal));
  }
}

// push point + keep window size
function pushPoint(chart, label, value){
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  if (chart.data.labels.length > secondsWindow){
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update('none'); // no animation for live updating
}

// Start ticking every second
let ticker = setInterval(tick, 1000);

// ------------------------ Controls ------------------------------------------
function toggleRunning(key, btnId){
  running[key] = !running[key];
  const btn = document.getElementById(btnId);
  btn.textContent = running[key] ? 'Pause' : 'Resume';
  btn.classList.toggle('paused', !running[key]);
}

// Buttons
document.getElementById('babies-pause').addEventListener('click', () => toggleRunning('babies','babies-pause'));
document.getElementById('condoms-pause').addEventListener('click', () => toggleRunning('condoms','condoms-pause'));
document.getElementById('women-pause').addEventListener('click', () => toggleRunning('women','women-pause'));

document.getElementById('babies-reset').addEventListener('click', () => {
  babiesTotal = 0;
  babiesChart.data.labels = buildInitialSeries(0).map(d => d.t);
  babiesChart.data.datasets[0].data = buildInitialSeries(0).map(d => d.v);
  babiesChart.update();
  document.getElementById('babies-counter').textContent = formatNumber(babiesTotal);
});
document.getElementById('condoms-reset').addEventListener('click', () => {
  condomPrice = initialCondomPrice;
  condomsChart.data.labels = buildInitialSeries(initialCondomPrice).map(d => d.t);
  condomsChart.data.datasets[0].data = buildInitialSeries(initialCondomPrice).map(d => d.v);
  condomsChart.update();
  document.getElementById('condoms-counter').textContent = formatCurrency(condomPrice);
});
document.getElementById('women-reset').addEventListener('click', () => {
  womenTotal = initialWomen;
  womenChart.data.labels = buildInitialSeries(womenTotal).map(d => d.t);
  womenChart.data.datasets[0].data = buildInitialSeries(womenTotal).map(d => d.v);
  womenChart.update();
  document.getElementById('women-counter').textContent = formatNumber(womenTotal);
});

// ------------------------ Tabs & animations ---------------------------------
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', (e) => {
  const target = e.currentTarget.dataset.tab;
  // toggle active tab
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  e.currentTarget.classList.add('active');

  // panels
  document.querySelectorAll('.panel').forEach(p => {
    if (p.id === target){
      p.classList.add('active');
      p.removeAttribute('aria-hidden');
    } else {
      p.classList.remove('active');
      p.setAttribute('aria-hidden', 'true');
    }
  });
}));

// small entrance animations
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.panel').forEach((p, i) => {
    p.style.transform = 'translateY(8px)';
    p.style.opacity = '0';
    setTimeout(() => {
      if (p.classList.contains('active')) {
        p.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1), opacity .35s ease';
        p.style.transform = 'translateY(0)';
        p.style.opacity = '1';
      }
    }, 80*i);
  });
});

// cleanup if user switches pages or closes
window.addEventListener('beforeunload', () => clearInterval(ticker));

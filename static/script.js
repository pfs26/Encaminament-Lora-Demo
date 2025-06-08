const chartCanvas = document.getElementById('myChart').getContext('2d');
const rawDataElement = document.getElementById('rawData');
const latestReading1Element = document.getElementById('latestReading1');
const latestReading2Element = document.getElementById('latestReading2');
const latestReading3Element = document.getElementById('latestReading3');
const dataGridBody = document.getElementById('dataGridBody');
const activeDevices = document.getElementById('activeDevices');
const networkStatus = document.getElementById('networkStatus');

let chart;
const MAX_CHART_DATA_POINTS = 20;
const MAX_DATAGRID_ROWS = 50;

// Setup WebSocket
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

socket.onopen = () => console.log('WebSocket connected');

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    rawDataElement.textContent = JSON.stringify(data, null, 2) + '\n' + rawDataElement.textContent;
    rawDataElement.textContent = rawDataElement.textContent.split('\n').slice(0, 500).join('\n');

    if (data.type === 'ttn_data' && data.payload?.transport?.data) {
      const transportData = data.payload.transport.data;
      if (transportData.length >= 2) {
        const appDataLength = transportData[1];
        const readings = transportData.slice(2, 2 + appDataLength);

        // Update chart and UI
        updateChart(readings);
        updateStats(readings);
        addDataGridRow(readings);

        // Update app-layer UI
        activeDevices.textContent = appDataLength;
        networkStatus.textContent = getNetworkStatus(appDataLength);
      }
    }
  } catch (error) {
    console.error("WebSocket error:", error);
  }
};

socket.onclose = () => console.log('WebSocket disconnected');
socket.onerror = (err) => console.error('WebSocket error:', err);

// Chart.js init
function initializeChart() {
  chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Dispositiu 1', data: [], borderColor: 'rgb(255, 99, 132)', tension: 0.1 },
        { label: 'Dispositiu 2', data: [], borderColor: 'rgb(54, 162, 235)', tension: 0.1 },
        { label: 'Dispositiu 3', data: [], borderColor: 'rgb(0, 255, 76)', tension: 0.1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false },
        x: {}
      },
      plugins: { legend: { display: true } }
    }
  });
}

// Chart update
function updateChart(readings) {
  if (!chart) initializeChart();

  const label = new Date().toLocaleTimeString();
  chart.data.labels.push(label);

  if (readings.length > 0) chart.data.datasets[0].data.push(readings[0]);
  if (readings.length > 1) chart.data.datasets[1].data.push(readings[1]);
  if (readings.length > 2) chart.data.datasets[2].data.push(readings[2]);

  if (chart.data.labels.length > MAX_CHART_DATA_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(dataset => dataset.data.shift());
  }

  chart.update();
}

// Update latest stats
function updateStats(readings) {
  latestReading1Element.textContent = `Dispositiu 1: ${readings[0] ?? '-'}`;
  latestReading2Element.textContent = `Dispositiu 2: ${readings[1] ?? '-'}`;
  latestReading3Element.textContent = `Dispositiu 3: ${readings[2] ?? '-'}`;
}

// Add row to datagrid
function addDataGridRow(readings) {
  const row = dataGridBody.insertRow(0);
  row.insertCell(0).textContent = new Date().toLocaleString();
  row.insertCell(1).textContent = readings[0] ?? '-';
  row.insertCell(2).textContent = readings[1] ?? '-';
  row.insertCell(3).textContent = readings[2] ?? '-';

  while (dataGridBody.rows.length > MAX_DATAGRID_ROWS) {
    dataGridBody.deleteRow(-1);
  }
}

// Network status based on appDataLength
function getNetworkStatus(count) {
  switch (count) {
    case 3: return '✅ Tots els dispositius funcionen';
    case 2: return '⚠️ Error entre Dispositiu 2 i 3';
    case 1: return '⚠️ Error entre Dispositiu 1 i 2';
    default: return '❌ Cap dispositiu actiu';
  }
}

window.onload = () => {
  initializeChart();
};

const chartCanvas = document.getElementById('myChart').getContext('2d');
const rawDataElement = document.getElementById('rawData');
const statsElement = document.getElementById('stats');

let chart;
const MAX_DATA_POINTS = 20; // Keep only last N data points

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// Connect to the /ws endpoint on the same host
const wsURL = `${wsProtocol}//${window.location.host}/ws`;

const socket = new WebSocket(wsURL);

socket.onopen = () => {
    console.log('WebSocket connection established to /ws');
};


socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Data from server:', data);
    rawDataElement.textContent = JSON.stringify(data, null, 2) + '\n' + rawDataElement.textContent;

    if (data.type === 'ttn_data' && data.payload) {
        // Assuming data.payload is something like { temperature: 25, humidity: 60 }
        updateChart(data.payload);
        updateStats(data.payload);
    }
};

socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};

function initializeChart() {
    chart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: [], // Timestamps or counters
            datasets: [{
                label: 'Sensor Value 1 (e.g., Temperature)',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            },
            {
                label: 'Sensor Value 2 (e.g., Humidity)',
                data: [],
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false // Adjust as needed
                }
            }
        }
    });
}

function updateChart(payload) {
    if (!chart) initializeChart();

    const now = new Date();
    const label = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    chart.data.labels.push(label);
    // Example: your payload has 'temperature' and 'humidity'
    chart.data.datasets[0].data.push(payload.temperature);
    chart.data.datasets[1].data.push(payload.humidity);


    // Limit the number of data points
    if (chart.data.labels.length > MAX_DATA_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }
    chart.update();
}

function updateStats(payload) {
    // Example: simple stats
    let statsHTML = '<h3>Latest Stats:</h3>';
    for (const key in payload) {
        statsHTML += `<p><strong>${key}:</strong> ${payload[key]}</p>`;
    }
    statsElement.innerHTML = statsHTML;
}

// Initialize chart on load
window.onload = () => {
    initializeChart();
};
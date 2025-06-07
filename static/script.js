const chartCanvas = document.getElementById('myChart').getContext('2d');
const rawDataElement = document.getElementById('rawData');
const statsElement = document.getElementById('stats');
const latestReading1Element = document.getElementById('latestReading1');
const latestReading2Element = document.getElementById('latestReading2'); // Add more if needed
const dataGridBody = document.querySelector('#dataGrid tbody');

let chart;
const MAX_CHART_DATA_POINTS = 20; // Keep only last N data points on the chart
const MAX_DATAGRID_ROWS = 50; // Keep only last N rows in the datagrid

// Determine WebSocket protocol based on window location
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsURL = `${wsProtocol}//${window.location.host}/ws`; // Connect to the /ws endpoint

const socket = new WebSocket(wsURL);

socket.onopen = () => {
    console.log('WebSocket connection established');
    // socket.send('Hello Server!'); // Optional
};

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        console.log('Data from server:', data);
        rawDataElement.textContent = JSON.stringify(data, null, 2) + '\n' + rawDataElement.textContent;

        // Limit the raw data log to prevent memory issues
        const lines = rawDataElement.textContent.split('\n');
        if (lines.length > 500) { // Keep roughly the last 500 lines
             rawDataElement.textContent = lines.slice(0, 500).join('\n');
        }


        if (data.type === 'ttn_data' && data.payload) {
            const decodedPayload = data.payload;
            const transportData = decodedPayload?.transport?.data;

            // --- Extract Sensor Readings ---
            // Skip the first two elements (headers)
            if (Array.isArray(transportData) && transportData.length >= 3) { // Need at least 3 elements (2 headers + 1 reading)
                const sensorReading1 = transportData[2];
                const sensorReading2 = transportData.length > 3 ? transportData[3] : null; // Check if there's a 4th element

                // --- Update UI ---
                updateChart([sensorReading1, sensorReading2].filter(val => val !== null)); // Filter out null if only one reading
                updateStats([sensorReading1, sensorReading2].filter(val => val !== null));
                addDataGridRow([sensorReading1, sensorReading2].filter(val => val !== null));

            } else {
                console.warn("Payload does not contain expected transport.data array with enough elements:", decodedPayload);
            }
        }
    } catch (error) {
        console.error("Error processing WebSocket message:", error);
        console.error("Message data:", event.data); // Log the raw message data
    }
};

socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};

// --- Chart.js Initialization ---
function initializeChart() {
    chart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: [], // Timestamps or counters
            datasets: [
            {
                label: 'Sensor Reading 1',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                fill: false // Don't fill area under the line
            },
            {
                label: 'Sensor Reading 2',
                data: [],
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1,
                fill: false // Don't fill area under the line
            }
            // Add more datasets here for more sensors
            ]
        },
        options: {
            responsive: true, // Make chart responsive
            maintainAspectRatio: false, // Allow height control via CSS
            scales: {
                y: {
                    beginAtZero: false // Adjust as needed based on expected sensor values
                },
                x: {
                     // Example: configure x-axis for time-based data if you want more precision
                     // type: 'time',
                     // time: {
                     //    unit: 'second'
                     // },
                     // ticks: {
                     //    source: 'auto'
                     // }
                }
            },
            plugins: {
                legend: {
                    display: true // Show the legend for datasets
                },
                // annotation: { // Example if you want to use the annotation plugin
                //     annotations: {
                //         // Define annotations here if needed
                //     }
                // }
            }
        }
    });
}

// --- Update Chart with New Data ---
function updateChart(readings) {
    if (!chart) initializeChart();

    const now = new Date();
    // Format label as HH:MM:SS
    const label = now.toLocaleTimeString(); // Or more detailed: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`

    chart.data.labels.push(label);

    // Add readings to respective datasets
    if (readings.length > 0) chart.data.datasets[0].data.push(readings[0]);
    if (readings.length > 1) chart.data.datasets[1].data.push(readings[1]);
    // Add logic for more datasets if needed

    // Limit the number of data points on the chart
    if (chart.data.labels.length > MAX_CHART_DATA_POINTS) {
        chart.data.labels.shift(); // Remove oldest label
        chart.data.datasets.forEach(dataset => dataset.data.shift()); // Remove oldest data point from each dataset
    }
    chart.update(); // Update the chart display
}

// --- Update Latest Stats ---
function updateStats(readings) {
     if (readings.length > 0) latestReading1Element.textContent = `Sensor Reading 1: ${readings[0]}`;
     else latestReading1Element.textContent = `Sensor Reading 1: -`; // Handle case where reading 1 is missing

     if (readings.length > 1) latestReading2Element.textContent = `Sensor Reading 2: ${readings[1]}`;
     else latestReading2Element.textContent = `Sensor Reading 2: -`; // Handle case where reading 2 is missing

     // Add logic for more stats elements
}


// --- Add Row to Data Grid ---
function addDataGridRow(readings) {
    const now = new Date();
    const timestamp = now.toLocaleString(); // Format timestamp nicely

    const newRow = dataGridBody.insertRow(0); // Insert at the top (most recent first)

    const timestampCell = newRow.insertCell(0);
    const reading1Cell = newRow.insertCell(1);
    const reading2Cell = newRow.insertCell(2);
    // Add more cells for more sensors

    timestampCell.textContent = timestamp;
    reading1Cell.textContent = readings.length > 0 ? readings[0] : '-';
    reading2Cell.textContent = readings.length > 1 ? readings[1] : '-';
    // Set textContent for more cells

    // Limit the number of rows in the datagrid
    while (dataGridBody.rows.length > MAX_DATAGRID_ROWS) {
        dataGridBody.deleteRow(dataGridBody.rows.length - 1); // Remove the last row
    }
}


// --- Initialize chart on load ---
window.onload = () => {
    initializeChart();
    // Optionally, fetch some initial data if you have a history endpoint
};
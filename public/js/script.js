// Set the initial index
let currentIndex = 0

// Function to make a request to the API
const fetchData = async (url) => {
    let apiUrl;
    if(url != 'http://localhost:3000/api/collections'){
        apiUrl = url+`/${currentIndex}`;   
    }else{
        apiUrl = url
    }
     // Increment the index for the next request
     currentIndex++;

     // Reset the index to 1 if it exceeds a certain value (e.g., 10)
     if (currentIndex > 1000000) {
         currentIndex = 1;
     }

    try {
        // Make a GET request to the API endpoint using fetch
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();

        if(url != 'http://localhost:3000/api/collections'){
            return data.value 
        }else{
            return data.collections
        }
        
        
    } catch (error) {
        console.error('Error:', error.message);
    }
};
let datasets = []; // Array to store data series
let time = []; // Array to store timestamps

// Returns current time as a string
function getCurrentTime() {
    return new Date().toLocaleTimeString();
}

// Calculates Pearson correlation coefficient between two arrays
function pearsonCorrelation(x, y) {
    let computationCounter = 0;
    
const n = x.length;
    
      // Calculate the mean of x and y
      const meanX = x.reduce((sum, value) => sum + value, 0) / n;
      computationCounter += x.length + 1;
      const meanY = y.reduce((sum, value) => sum + value, 0) / n;
      computationCounter += x.length + 1;
       
      // Calculate the numerator and denominators
      let numerator = 0;
      let denominatorX = 0;
      let denominatorY = 0;
   
      
      for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
       
        computationCounter++;
  
        const diffY = y[i] - meanY;
        computationCounter++;
    
        numerator += diffX * diffY;
        computationCounter += 2;
  
        denominatorX += diffX ** 2;
        computationCounter += 2;
  
        denominatorY += diffY ** 2;
        computationCounter += 2;
      }
    
     
      // Calculate the correlation coefficient
      let correlation = numerator / Math.sqrt(denominatorX * denominatorY);
      computationCounter += 3;
      
      
      if(isNaN(correlation)){
        correlation = 0
        return correlation;
      }else{
       return correlation; 
      }
      
      
}


// Updates the chart with new datasets
function updateChart(chart) {
    chart.data.datasets = datasets;
    chart.update();
}

function updateData() {
    datasets.forEach(async (dataset,index) => {
        if (dataset.data.length >= 100) dataset.data.pop(); // Limit data array size
        let x = parseFloat(await fetchData(`http://localhost:3000/api/${dataset.label}`)) 
        dataset.data.unshift(x); // Add data from the api
    });
    if (time.length >= 100) time.pop(); // Limit time array size
    time.unshift(getCurrentTime()); // Add current time
}

function addSeries(){
    let collection = document.getElementById('timeSeriesSelect').value; 
    const newColor = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
    // Create new dataset object
    const newDataset = {
        label: collection,
        data: [],
        borderColor: newColor,
        backgroundColor: newColor,
    };
    datasets.push(newDataset); // Add new dataset to the array
    document.getElementById('seriesCount').innerText = datasets.length;
    updateChart(chart);
    updateDatasetSelectOptions();
    
   
}

function updateDatasetSelectOptions() {
    const select = document.getElementById('datasetSelect');
    select.innerHTML = '<option disabled selected value="">Select Series</option>';
    datasets.forEach((dataset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = dataset.label;
        select.appendChild(option);
    });
}

function deleteSeries() {
    const select = document.getElementById('datasetSelect');
    const selectedIndex = select.value;
    if (selectedIndex >= 0 && datasets[selectedIndex]) {
        datasets.splice(selectedIndex, 1); // Remove the selected dataset
        updateChart(chart);
        updateDatasetSelectOptions();
    }
    document.getElementById('seriesCount').innerText = datasets.length;
}

// Initializes and returns a Chart.js chart instance
function setupChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: time,
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        maxRotation: 90, // Adjust label rotation
                        minRotation: 90,
                        font: {
                            size: 10
                        }
                    },
                    reverse: true, // Newest data on the right
                },
                y: { 
                    beginAtZero: true // Start y-axis at zero
                }
            }
        }
    });
}

let chart;
let intervalId = null; // Holds the interval reference for data updates

// Starts periodic data updates
function startDataUpdates() {
    if (intervalId === null) {
        intervalId = setInterval(async function () {
            updateData(); // Update data
            updateChart(chart); // Update chart
            updateCorrelationDisplay(); // Update correlation display
            
        }, 300); // Update interval in milliseconds
    }
}

// Stops periodic data updates
function stopDataUpdates() {
    if (intervalId !== null) {
        clearInterval(intervalId); // Clear the interval
        intervalId = null;
    }
}

// Calculates and returns a correlation matrix for the current datasets
function calculateCorrelationMatrix() {
    const sliceSize = parseInt(document.getElementById('sliceSizeSelect').value, 10);
    const correlationMatrix = [];
    for (let i = 0; i < datasets.length; i++) {
        const row = [];
        for (let j = 0; j < datasets.length; j++) {
            if (i === j) {
                row.push(1);
            } else if (i >= j) {
                let array1 = datasets[i].data.slice(0, sliceSize);
                let array2 = datasets[j].data.slice(0, sliceSize);
                
                if(array1.length == array2.length && array1.length == sliceSize){
                    const correlation = pearsonCorrelation(array1, array2).toFixed(2);
                    row.push(correlation);   
                } else {
                    row.push(NaN);
                } 
            } else {
                row.push('-');
            }
        }
        correlationMatrix.push(row);
    }
    return correlationMatrix;
}


// Updates the display to show the current correlation matrix
function updateCorrelationDisplay() {
    const correlationMatrix = calculateCorrelationMatrix();
    const correlationDisplay = document.getElementById('correlationDisplay');
    let correlationHTML = '<table class="correlation-table  table table-striped"><tr><th></th>';

    // Add dataset labels as table headers
    datasets.forEach(dataset => {
        correlationHTML += `<th>${dataset.label}</th>`;
    });

    correlationHTML += '</tr>';

    correlationMatrix.forEach((row, rowIndex) => {
        correlationHTML += `<tr><th>${datasets[rowIndex].label}</th>`;
        row.forEach(value => {
            correlationHTML += `<td>${value}</td>`;
        });
        correlationHTML += '</tr>';
    });

    correlationHTML += '</table>';
    correlationDisplay.innerHTML = correlationHTML;
}

// Initialize and set event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    chart = setupChart();

    const collections = await fetchData('http://localhost:3000/api/collections')
    const select = document.getElementById('timeSeriesSelect');
    select.innerHTML = '<option disabled selected value="">Select time Series</option>';
    collections.forEach((collection, index) => {
    const option = document.createElement('option');
    option.value = collection;
    option.textContent = collection;
    select.appendChild(option);
    
});

    document.getElementById('startButton').addEventListener('click', startDataUpdates);
    document.getElementById('stopButton').addEventListener('click', stopDataUpdates);
    document.getElementById('addSeriesButton').addEventListener('click', addSeries);
    document.getElementById('deleteSeriesButton').addEventListener('click', deleteSeries);

});

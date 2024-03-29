import { pearsonCorrelation, pearsonEnhanced} from "./pearson.js";
import { selectOptions, removeSeriesFromSelected, selectedSeries,setControlPanelLocal } from "./controlPanel.js";
import { fetchData } from "./ApiHandler.js";
import { sendTotalDataToBackend, sendDetectdDataToBackend, sendAdminSettingsToUser} from "./sendToBackend.js";
import { getCurrentTime, getTimeDate } from './dates.js'

let datasets =JSON.parse(localStorage.getItem('datasets')) ||  []  // Array to store data series
let time = JSON.parse(localStorage.getItem('time')) || []; // Array to store timestamps
let totalData = {'names': [], 
                'addDate': [], 
                'endDate': [], 
                'threshold':[]};
let correlationObject = {'correlatedSeries': [],
                         'startTime': [],
                         'endTime': [],
                         'threshold': [], 
                         'Date': [],
                        'Windowsize':[] }
let pearsonData =[[]]
let windowSize = 0


// Updates the chart with new datasets
function updateChart(chart) {
  chart.data.datasets = datasets;
  chart.update();
}

async function updateData() {
  console.log(JSON.parse(localStorage.getItem('time')))
  for (const dataset of datasets) {
    if (dataset.data.length >= 120) dataset.data.pop(); // Remove oldest data point from the end
    let x = parseFloat(
      await fetchData(`http://localhost:3000/api/${dataset.label}`)
    );
    dataset.data.unshift(x); // Add new data point to the beginning
  }
  localStorage.setItem('datasets',JSON.stringify(datasets))

  if (time.length >= 120) time.pop(); // Remove oldest time point from the end
  time.unshift(getCurrentTime()); // Add current time to the beginning
  localStorage.setItem('time',JSON.stringify(time))
}

function addSeries() {

  const select = document.getElementById('timeSeriesSelect');
  const selectedValue = select.value;
  
  if (selectedValue && !selectedSeries.includes(selectedValue)) {
      selectedSeries.push(selectedValue); // Add the selected series to the array
      selectOptions(); // Refresh the select options to hide the added series
  }

  let collection = document.getElementById("timeSeriesSelect").value;
  if (!collection) {
    alert("Please select a series before adding."); // Alert if no series is selected
    return;
  }
  const newColor = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
  
  // Create new dataset object
  const newDataset = {
    label: collection,
    data: [],
    borderColor: newColor,
    backgroundColor: newColor,
  };
  // check if series name not in the Total data
  if (!totalData.names.includes(newDataset.label)) {
    totalData.names.push(newDataset.label);
     // add the time that user add series
    totalData.addDate.push( getTimeDate());
  }

  datasets.push(newDataset); // Add new dataset to the array
  localStorage.setItem('datasets',JSON.stringify(datasets))
  document.getElementById("seriesCount").innerText = datasets.length;
  updateChart(chart);
  updateDatasetSelectOptions();
}

function updateDatasetSelectOptions() {
  const select = document.getElementById("datasetSelect");
  select.innerHTML =
    '<option disabled selected value="">Select Series</option>';
  datasets.forEach((dataset, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = dataset.label;
    select.appendChild(option);
  });
}


function deleteSeries() {
    const select = document.getElementById('datasetSelect');
    const selectedIndex = select.value;
    if (selectedIndex >= 0 && datasets[selectedIndex]) {
        const deletedSeries = datasets[selectedIndex].label;

        // Remove the selected dataset
        datasets.splice(selectedIndex, 1); 
        localStorage.setItem('datasets',JSON.stringify(datasets))

        // Use the imported function to remove the deleted series from selectedSeries
        removeSeriesFromSelected(deletedSeries);

        // Update totalData to remove the deleted series data
        totalData.names.splice(selectedIndex, 1);
        totalData.addDate.splice(selectedIndex, 1);
        totalData.endDate.splice(selectedIndex, 1);
        if(totalData.names,length == 0){
           totalData.threshold = [];
        }

        // Refresh the chart and dataset select options
        updateChart(chart);
        updateDatasetSelectOptions();

        // Refresh the options in the series select dropdown
        // Assuming selectOptions is accessible here, otherwise import it as needed
        selectOptions();

        // Update the displayed series count
        document.getElementById('seriesCount').innerText = datasets.length;
    } else {
        // Handle the case where no valid series is selected for deletion
        console.warn('No valid series selected for deletion');
    }

}

// Initializes and returns a Chart.js chart instance
function setupChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: time,
      datasets: datasets,
    },
    options: {
      tension: 0.4,
      elements: {
        point: {
          radius: 0,
          hitRadius: 10,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 90, // Adjust label rotation
            minRotation: 90,
            font: {
              size: 10,
            },
          },
          reverse: true, // Newest data on the right
        },
        y: {
          beginAtZero: true, // Start y-axis at zero
        },
      },
    },
  });
}
//This function for update the threshold valus
async function thresholdUpdate(){
  let thresh;

    thresh = $("#slider-range").slider("values");
    localStorage.setItem('threshold',JSON.stringify(thresh))
    totalData.threshold[0] = parseFloat(thresh[0]);
    totalData.threshold[1] = parseFloat(thresh[1]);

  thresh = [];
}

let chart;
let intervalId = null; // Holds the interval reference for data updates

// Starts periodic data updates
function startDataUpdates(e) {

  //these 4 lines to save the window size and the function type in the local sotrage
  let window = document.getElementById('sliceSizeSelect').value
  localStorage.setItem('window',window)
  let functionName = document.getElementById('functionSelect').value
  localStorage.setItem('function',functionName);

  disableControls();
 // setSettings()
  
  if (intervalId === null) {
    thresholdUpdate()
    console.log(totalData);
    sendTotalDataToBackend(e,totalData)

    

    intervalId = setInterval(async function () {
      updateData(); // Update data
      updateChart(chart); // Update chart
      updateCorrelationDisplay(); // Update correlation display
    }, 1300); // Update interval in milliseconds
  }

}

// Stops periodic data updates
function stopDataUpdates(e) {
  enableControls();
  // e.preventDefault(); // Stop refreshing the page

  totalData.endDate[0] =  getTimeDate(); // Add the time that user end
  thresholdUpdate()
  // After the user stop the program the data will be sended to the backend

  if (intervalId !== null) {
      console.log(totalData);
      sendTotalDataToBackend(e,totalData)

    clearInterval(intervalId); // Clear the interval
    intervalId = null;

    if(correlationObject.correlatedSeries.length > 0){
      for(let i = 0; i < correlationObject.correlatedSeries.length; i++){
        let correlatedNames = correlationObject.correlatedSeries[i].split(',');
        printNotification(i,correlatedNames); 
      }
        correlationObject.correlatedSeries = [];
        correlationObject.startTime = [];
        correlationObject.endTime = [];
        correlationObject.threshold = [];
        correlationObject.Date = [];

    }
    
  }
}




// Calculates and returns a correlation matrix for the current datasets
function calculateCorrelationMatrix(e) {
  let correlation, gx, gy, sx, sy, sxy, sxx, syy,n;

  let typeOfFunction = document.getElementById('functionSelect').value;
  const sliceSize = parseInt(document.getElementById("sliceSizeSelect").value,10);
  const correlationMatrix = [];

  for (let i = 0; i < datasets.length; i++) {
    const row = [];
    for (let j = 0; j < datasets.length; j++) {
      if (i === j) {
        row.push(1);
      } else if (i >= j) {
        let array1 = datasets[i].data.slice(0, sliceSize);
        let array2 = datasets[j].data.slice(0, sliceSize);
        
        if (array1.length == array2.length && array1.length == sliceSize) {
        
          if(typeOfFunction == "pearson"){
            console.log(datasets[i].label, datasets[j].label, i,j);
            correlation = pearsonCorrelation(array1, array2);
            }else{
              // console.log(windowSize,sliceSize);
              //console.log(pearsonData[j][i]);
              if (pearsonData[j] === undefined || pearsonData[j][i] === undefined ) {
                pearsonData[j] = pearsonData[j] || [];
                pearsonData[j][i] = pearsonData[j][i] || [];
                pearsonData[j][i].push(0, 0, 0, 0, 0, 0, 0,windowSize);
              }
              
              // console.log(pearsonData[j][i]);
              [correlation, gx, gy, sx, sy, sxy, sxx, syy,n] = pearsonEnhanced(array1, array2, pearsonData[j][i][0],  pearsonData[j][i][1],  
                pearsonData[j][i][2],  pearsonData[j][i][3], pearsonData[j][i][4], pearsonData[j][i][5], pearsonData[j][i][6],pearsonData[j][i][7]);
                
                
                // console.log('after person ', correlationn);
             console.log('after the pearsonEnhanced', correlation);
             console.log(correlation, gx, gy, sx, sy, sxy, sxx, syy,n);
              
              pearsonData[j][i][0] = gx
              pearsonData[j][i][1] = gy 
              pearsonData[j][i][2] = sx
              pearsonData[j][i][3]= sy 
              pearsonData[j][i][4]= sxy
              pearsonData[j][i][5]= sxx
              pearsonData[j][i][6]= syy
              pearsonData[j][i][7]= n

    
            }

            correlation = correlation.toFixed(2);

          let string = '';
          string = datasets[i].label +","+datasets[j].label

          if (correlation >= totalData.threshold[0] && correlation <= totalData.threshold[1]) {
        
            if (!correlationObject.correlatedSeries.includes(string)){
              let sliceSize = parseInt(document.getElementById("sliceSizeSelect").value,10);
                correlationObject.correlatedSeries.push(string);
                correlationObject.startTime.push( getCurrentTime());
                correlationObject.endTime.push( getCurrentTime());
                correlationObject.threshold.push([parseFloat(correlation)]);
                correlationObject.Date.push(getTimeDate());
                correlationObject.Windowsize.push(sliceSize);


            }else{
                let index = correlationObject.correlatedSeries.indexOf(string);
                correlationObject.endTime[index]= getCurrentTime()
                correlationObject.threshold[index].push(parseFloat(correlation))
                correlationObject.Windowsize[index] =(sliceSize);
            }   
          }else{
              if(correlationObject.correlatedSeries.indexOf(string) != -1){
        
                  let index = correlationObject.correlatedSeries.indexOf(string);
                  let correlatedNames = correlationObject.correlatedSeries[index].split(',');

                  printNotification(index,correlatedNames);

                  let objectToBeSent = {
                    'correlatedSeries': [correlationObject.correlatedSeries[index]],
                  'startTime':  [ correlationObject.startTime[index]],
                  'endTime':  [correlationObject.endTime[index]],
                  'threshold':  correlationObject.threshold[index],
                   "Date":  correlationObject.Date[index],
                   "Windowsize": correlationObject.Windowsize[index]
                } 
                
                  sendDetectdDataToBackend(objectToBeSent)

                  correlationObject.correlatedSeries.splice(index,1);
                  correlationObject.startTime.splice(index,1);
                  correlationObject.endTime.splice(index,1);
                  correlationObject.threshold.splice(index,1);
                  correlationObject.Date.splice(index,1);
              }
            }  
          row.push(correlation);
        } else {
          row.push(NaN);

        }
      } else {
        row.push("-");
      }
    }
    correlationMatrix.push(row);
  }
  return correlationMatrix;
}

function printNotification(index, correlatedNames) {
  let notificationContainer = document.getElementById("notificationContent");

  // Remove the oldest notification if there are already 6 notifications
  if (notificationContainer.children.length >= 6) {
      notificationContainer.removeChild(notificationContainer.children[5]);
  }

  let notificationId = 'notification-' + Date.now();

  let appendedCode = `
      <div id="${notificationId}" class="alert alert-success alert-dismissible fade show fade-in" role="alert">
      Correlation detected from ${correlationObject.startTime[index]} to ${correlationObject.endTime[index]}
      between ${correlatedNames[0]} and ${correlatedNames[1]} !
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
  `;

  notificationContainer.insertAdjacentHTML("afterbegin", appendedCode);

  let specificNotification = document.getElementById(notificationId);

  // Set a timeout for this specific notification
  specificNotification.timeout = setTimeout(function() {
      if (specificNotification) {
          specificNotification.classList.remove('alert-success');
          specificNotification.classList.add('alert-secondary');
      }
  }, 3000);
}


// Updates the display to show the current correlation matrix
function updateCorrelationDisplay(e) {
  const correlationMatrix = calculateCorrelationMatrix(e);
  const correlationDisplay = document.getElementById("correlationDisplay");
  let correlationHTML = '<table class="correlation-table table table-striped">';

  // Transposing the header row and the first column
  correlationHTML += "<tr><th></th>";
  correlationMatrix.forEach((_, rowIndex) => {
    correlationHTML += `<th>${datasets[rowIndex].label}</th>`;
  });
  correlationHTML += "</tr>";

  // Adding dataset labels and transposing data cells
  datasets.forEach((dataset, columnIndex) => {
    correlationHTML += `<tr><th>${dataset.label}</th>`;
    correlationMatrix.forEach((row) => {
      let value = row[columnIndex];
      let cellClass = "heatmap-cell ";
      if (value === "-") {
        cellClass += "undefined";
      } else if (!isNaN(value)) {
        const numValue = parseFloat(value);
        if (numValue >= 0.8 && numValue <= 1) {
          cellClass += "very-high";
        } else if (numValue >= 0.6 && numValue < 0.8) {
          cellClass += "high";
        } else if (numValue >= 0.4 && numValue < 0.6) {
          cellClass += "medium";
        } else if (numValue >= 0.2 && numValue < 0.4) {
          cellClass += "low";
        } else if (numValue > 0 && numValue < 0.2) {
          cellClass += "very-low";
        } else if (numValue > -0.2 && numValue < 0) {
          cellClass += "low-negative";
        } else if (numValue > -0.4 && numValue <= -0.2) {
          cellClass += "medium-negative";
        } else if (numValue > -0.6 && numValue <= 0.4) {
          cellClass += "high-negative";
        } else if (numValue >= -1 && numValue <= 0.6) {
          cellClass += "very-high-negative";
        }
      } else {
        cellClass += "undefined";
      }
      correlationHTML += `<td class="${cellClass}">${value}</td>`;
    });
    correlationHTML += "</tr>";
  });

  correlationHTML += "</table>";
  correlationDisplay.innerHTML = correlationHTML;
}

function disableControls() {
  $("#datasetSelect").prop("disabled", true);
  $("#sliceSizeSelect").prop("disabled", true);
  $("#range").prop("disabled", true);
  $("#deleteSeriesButton").prop("disabled", true);
  $("#slider-range").slider("option", "disabled", true);

  // Uncomment these if you want to disable adding series functionality
  // $("#timeSeriesSelect").prop("disabled", true);
  // $("#addSeriesButton").prop("disabled", true);
}

function enableControls() {
  $("#datasetSelect").prop("disabled", false);
  $("#sliceSizeSelect").prop("disabled", false);
  $("#range").prop("disabled", false);
  $("#deleteSeriesButton").prop("disabled", false);
  $("#slider-range").slider("option", "disabled", false);

  // Uncomment these if you want to re-enable adding series functionality
  // $("#timeSeriesSelect").prop("disabled", false);
  // $("#addSeriesButton").prop("disabled", false);
}


// Initialize and set event listeners when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async (e) => {
  chart = setupChart();
  await selectOptions();
  updateDatasetSelectOptions()
  setControlPanelLocal()

// Event listener for the start button
document.getElementById("startButton").addEventListener("click", function(event) {
  var sliceSizeSelect = document.getElementById('sliceSizeSelect');
  var thresholdValues = $("#slider-range").slider("values");

  if (datasets.length === 0) {
    alert('Please add at least one series before starting.');
    event.preventDefault();
    return;
  }

  if (thresholdValues[0] === -1 && thresholdValues[1] === 1) {
    alert('Please adjust the threshold values before starting.');
    event.preventDefault();
    return;
  }

  if (!sliceSizeSelect.value || sliceSizeSelect.value === 'Window Size') {
    alert('Please select a window size before starting.');
    event.preventDefault();
    return;
  }

  startDataUpdates(e);
});

function setSettings(){
  let id = document.getElementById('userID').value.trim();

  let temp = $("#slider-range").slider("values");
  let threshold = [];
  threshold[0] = parseFloat(temp[0]);
  threshold[1] = parseFloat(temp[1]);

  let window = document.getElementById('sliceSizeSelect').value;
  sendAdminSettingsToUser(id,threshold,window);
}


  document.getElementById("stopButton").addEventListener("click", stopDataUpdates);
  document.getElementById("addSeriesButton").addEventListener("click", addSeries);
  document.getElementById("deleteSeriesButton").addEventListener("click", deleteSeries);
  document.getElementById('setButton').addEventListener('click',setSettings)
});

document.getElementById('process-button').addEventListener('click', () => {
  const dataInput = document.getElementById('data-input').value.trim();
  const mergeInput = document.getElementById('merge-input').value.trim();

  if (!dataInput) {
    alert("Please paste your data!");
    return;
  }

  const rows = dataInput.split('\n').map(row => row.split('\t'));

  const parsedData = rows.map(columns => ({
    centrality: columns[0],
    npart: parseFloat(columns[1]),
    npartError: parseFloat(columns[2]),
    dndy: parseFloat(columns[3]),
    dndyError: parseFloat(columns[4])
  }));

  const mergeGroups = mergeInput.split(',').map(group => group.trim());

  let outputHTML = "<table><thead><tr><th>Merged Centrality</th><th>Merged dN/dy</th><th>Error</th></tr></thead><tbody>";

  const mergedData = mergeGroups.map(group => {
    const [start, end] = group.split('-').map(Number);

    const binsInGroup = parsedData.filter(bin => {
      const [binStart, binEnd] = bin.centrality.split('-').map(Number);
      return binStart >= start && binEnd <= end;
    });

    if (binsInGroup.length === 0) {
      outputHTML += `<tr><td>${group}</td><td colspan="2">No bins found</td></tr>`;
      return null;
    }

    const weightedSum = binsInGroup.reduce((sum, bin) => sum + bin.dndy * bin.npart, 0);
    const totalNpart = binsInGroup.reduce((sum, bin) => sum + bin.npart, 0);

    let errorSquaredSum = 0;

    for (const bin of binsInGroup) {
      const weight = bin.npart;
      const dndy = bin.dndy;
      const sigma_dndy = bin.dndyError;
      const epsilon_npart = bin.npartError;

      const partial_dndy = weight / totalNpart;
      const partial_npart = (dndy * totalNpart - weightedSum) / (totalNpart * totalNpart);

      errorSquaredSum += (partial_dndy * sigma_dndy) ** 2 + (partial_npart * epsilon_npart) ** 2;
    }

    const mergedDndy = weightedSum / totalNpart;
    const mergedError = Math.sqrt(errorSquaredSum);

    return {
      centrality: group,
      dndy: mergedDndy,
      error: mergedError
    };
  }).filter(item => item !== null);

  mergedData.forEach(row => {
    outputHTML += `<tr><td>${row.centrality}</td><td>${row.dndy.toFixed(3)}</td><td>${row.error.toFixed(3)}</td></tr>`;
  });

  outputHTML += "</tbody></table>";
  document.getElementById('result-table').innerHTML = outputHTML;

  // CSV and DAT
  function createCSV(data) {
    let csvContent = "Merged Centrality,Merged dN/dy,Error\n";
    data.forEach(row => {
      csvContent += `${row.centrality},${row.dndy.toFixed(3)},${row.error.toFixed(3)}\n`;
    });
    return csvContent;
  }

  function createDAT(data) {
    let datContent = "Merged Centrality\tMerged dN/dy\tError\n";
    data.forEach(row => {
      datContent += `${row.centrality}\t${row.dndy.toFixed(3)}\t${row.error.toFixed(3)}\n`;
    });
    return datContent;
  }

  // download buttons
  document.getElementById('download-csv').style.display = 'inline-block';
  document.getElementById('download-dat').style.display = 'inline-block';

  
  document.getElementById('download-csv').addEventListener('click', () => {
    const csvData = createCSV(mergedData);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged_data.csv';
    link.click();
  });

  document.getElementById('download-dat').addEventListener('click', () => {
    const datData = createDAT(mergedData);
    const blob = new Blob([datData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged_data.dat';
    link.click();
  });

  // Plotting 
  const ctx = document.getElementById('plot-canvas').getContext('2d');

  if (window.myChart) {
    window.myChart.destroy();
  }

  const inputData = parsedData.map(bin => {
    const [start, end] = bin.centrality.split('-').map(Number);
    const mid = (start + end) / 2;
    return { x: mid, y: bin.dndy };
  });

  const mergedPlotData = mergedData.map(row => {
    const [start, end] = row.centrality.split('-').map(Number);
    const mid = (start + end) / 2;
    return { x: mid, y: row.dndy };
  });

  window.myChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Original Bins',
          data: inputData,
          backgroundColor: 'blue',
          pointStyle: 'circle',
          pointRadius: 5,
          showLine: false
        },
        {
          label: 'Merged Bins',
          data: mergedPlotData,
          backgroundColor: 'red',
          pointStyle: 'triangle',
          pointRadius: 7,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'dN/dy vs Centrality'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Centrality (%)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'dN/dy'
          }
        }
      }
    }
  });

});

const ctx = document.getElementById('reportChart');

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Finance', 'Technical', 'HR'],
    datasets: [{
      label: 'Reports by Category',
      data: [5, 7, 3], // Replace with real data from backend
    }]
  },
});

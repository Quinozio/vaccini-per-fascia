var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

const charts = {};
fetch("vaccini-per-fascia/data/somministrazioni-vaccini-latest.json")
  .then((response) => response.json())
  .then((res) => {
    const data = res.data;

    const regioni = groupBy(data, "nome_area");
    const select = createSelectRegioni(regioni);
    createChart(data, "Veneto");
    select.addEventListener("change", (event) => {
      console.log(event);
      Object.keys(charts).forEach((chart) => {
        charts[chart].destroy();
      });

      createChart(data, event.target.value);
    });
  })
  .catch((error) => console.error(error));

function createChart(data, regione) {
  const venetoData = data.filter((item) => item.nome_area === regione);
  const fasce = groupBy(venetoData, "fascia_anagrafica");

  const fasceByFornitore = {};
  Object.keys(fasce).forEach((fascia) => {
    fasce[fascia].forEach((item) => {
      if (!fasceByFornitore[fascia]) {
        fasceByFornitore[fascia] = {};
      }
      if (!fasceByFornitore[fascia][item.fornitore]) {
        fasceByFornitore[fascia][item.fornitore] = 0;
      }
      fasceByFornitore[fascia][item.fornitore] =
        fasceByFornitore[fascia][item.fornitore] + item.prima_dose;
    });
  });
  const colorScheme = ["#25CCF7", "#FD7272", "#54a0ff", "#00d2d3", "#1abc9c"];

  Object.keys(fasceByFornitore).forEach((fascia) => {
    const chartData = {
      labels: [],
      datasets: [
        {
          label: "pippo",
          data: [],
          hoverOffset: 4,
          backgroundColor: colorScheme,
        },
      ],
    };
    Object.keys(fasceByFornitore[fascia]).forEach((fornitore) => {
      chartData.labels.push(fornitore);
      chartData.datasets[0].data.push(fasceByFornitore[fascia][fornitore]);
    });
    charts[fascia] = new Chart(document.getElementById(fascia), {
      type: "pie",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Fascia " + fascia,
          },

          labels: {
            render: "percentage",
            precision: 2,
          },
        },
      },
    });
  });
}

function createSelectRegioni(regioni) {
  const select = document.getElementById("regioni");
  Object.keys(regioni).forEach(function (regione) {
    const option = document.createElement("option");

    option.value = regione;

    option.innerHTML = regione;
    select.appendChild(option);
  });
  return select;
}

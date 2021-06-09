var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

const HttpClient = function () {
  this.get = function (aUrl, aCallback) {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function () {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
        aCallback(anHttpRequest.responseText);
    };

    anHttpRequest.open("GET", aUrl, true);
    anHttpRequest.send(null);
  };
};

const charts = {};
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const client = new HttpClient();
    client.get(
      "https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/dati/somministrazioni-vaccini-latest.json",
      (response) => {
        const data = JSON.parse(response).data;
        const lastUpdate = getLastUpdate(data);
        document.getElementById("lastUpdate").innerHTML = lastUpdate;
        const regioni = groupBy(data, "nome_area");
        const selectRegioni = createSelectRegioni(regioni);
        const periodo = document.getElementById("periodo");
        createChart(JSON.parse(JSON.stringify(data)), "Abruzzo", "settimana");
        periodo.addEventListener("change", (event) => {
          Object.keys(charts).forEach((chart) => {
            charts[chart].destroy();
          });
          const regione = selectRegioni.value;
          createChart(
            JSON.parse(JSON.stringify(data)),
            regione,
            event.target.value
          );
        });
        selectRegioni.addEventListener("change", (event) => {
          Object.keys(charts).forEach((chart) => {
            charts[chart].destroy();
          });

          createChart(
            JSON.parse(JSON.stringify(data)),
            event.target.value,
            periodo.value
          );
        });
      }
    );
  },
  false
);

function getLastUpdate(data) {
  return moment(data[data.length - 1].data_somministrazione).utc().format('DD/MM/YYYY HH:mm'); 
}

function createChart(data, regione, periodo) {
  const dataByRegione = data.filter((item) => item.nome_area === regione);
  const fasce = groupBy(dataByRegione, "fascia_anagrafica");

  const fasceByPeriodo = getFasceByPeriodo(periodo, fasce);

  const fasceByFornitore = getFasceByFornitore(fasceByPeriodo);
  const colorScheme = ["#25CCF7", "#FD7272", "#54a0ff", "#00d2d3"];
  Object.keys(fasceByFornitore).forEach((fascia) => {
    const chartData = {
      labels: [],
      datasets: [
        {
          label: fascia,
          data: [],
          hoverOffset: 4,
          backgroundColor: colorScheme,
        },
      ],
    };
    let totale = 0;
    Object.keys(fasceByFornitore[fascia]).forEach((fornitore) => {
      chartData.labels.push(fornitore);
      totale += fasceByFornitore[fascia][fornitore];
      chartData.datasets[0].data.push(fasceByFornitore[fascia][fornitore]);
    });
    charts[fascia] = new Chart(document.getElementById(fascia), {
      type: "pie",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: true,

        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: `Fascia ${fascia} - Totale: ${totale}`,
            font: {
              size: 16,
              weight: 'bold'
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const total = item.dataset.data.reduce(
                  (previousValue, currentValue) => previousValue + currentValue
                );
                const currentValue = item.dataset.data[item.dataIndex];
                const percentage = ((currentValue / total) * 100).toFixed(2);
                return `${item.label}: ${item.raw} (${percentage}%)`;
              },
            },
          },
          labels: {
            render: "percentage",
            precision: 2,
            fontSize: 16,
            textMargin: 0,
            position: "default",
          },
        },
      },
    });
  });
}

function getFasceByFornitore(fasceByPeriodo) {
  const fasceByFornitore = {};
  Object.keys(fasceByPeriodo).forEach((fascia) => {
    fasceByPeriodo[fascia].forEach((item) => {
      if (!fasceByFornitore[fascia]) {
        fasceByFornitore[fascia] = {
          Janssen: 0,
          Moderna: 0,
          "Pfizer/BioNTech": 0,
          "Vaxzevria (AstraZeneca)": 0,
        };
      }
      fasceByFornitore[fascia][item.fornitore] =
        fasceByFornitore[fascia][item.fornitore] + item.prima_dose;
    });
  });
  return fasceByFornitore;
}

function getFasceByPeriodo(periodo, fasce) {
  let fasceByPeriodo = {};
  if (periodo !== "sempre") {
    Object.keys(fasce).forEach((fascia) => {
      fasce[fascia].forEach((item) => {
        let previusRange;
        switch (periodo) {
          case "settimana":
            previusRange = moment(new Date()).subtract(7, "d");
            break;

          case "1_mese":
            previusRange = moment(new Date()).subtract(1, "month");
            break;
          case "3_mesi":
            previusRange = moment(new Date()).subtract(3, "month");
            break;
          case "6_mesi":
            previusRange = moment(new Date()).subtract(6, "month");
            break;

          default:
            break;
        }
        if (!fasceByPeriodo[fascia]) {
          fasceByPeriodo[fascia] = [];
        }
        if (
          moment(item.data_somministrazione).isBetween(
            previusRange,
            moment(new Date()),
            "day",
            "[("
          )
        ) {
          fasceByPeriodo[fascia].push(item);
        }
      });
    });
  } else {
    fasceByPeriodo = fasce;
  }
  return fasceByPeriodo;
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

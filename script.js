var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

const charts = {};
document.addEventListener(
  "DOMContentLoaded",
  () => {
    fetch("data/somministrazioni-vaccini-latest.json")
      .then((response) => response.json())
      .then((res) => {
        const data = res.data;

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
      })
      .catch((error) => console.error(error));
  },
  false
);

function createChart(data, regione, periodo) {
  const dataByRegione = data.filter((item) => item.nome_area === regione);
  const fasce = groupBy(dataByRegione, "fascia_anagrafica");

  const fasceByPeriodo = getFasceByPeriodo(periodo, fasce);

  const fasceByFornitore = getFasceByFornitore(fasceByPeriodo);
  const colorScheme = ["#25CCF7", "#FD7272", "#54a0ff", "#00d2d3"];
  console.log(fasceByFornitore);
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
            previusRange.format(),
            moment(new Date()).format()
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

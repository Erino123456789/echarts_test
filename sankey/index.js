var dom = document.getElementById("chart-container");
var myChart = echarts.init(dom, null, {
  renderer: "canvas",
  useDirtyRect: false,
});
var app = {};
var ROOT_PATH = "https://echarts.apache.org/examples";
var option;

myChart.showLoading();
$.get(
  "https://erino123456789.github.io/echarts_test/sankey/sankey.json",
  function (data) {
    myChart.hideLoading();
    myChart.setOption(
      (option = {
        title: {
          text: "Sankey Diagram",
        },
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
        },
        series: [
          {
            type: "sankey",
            data: data.nodes,
            links: data.links,
            lineStyle: {
              color: "gradient",
              curveness: 0.5,
            },
          },
        ],
      })
    );
  }
);

if (option && typeof option === "object") {
  myChart.setOption(option);
}

window.addEventListener("resize", myChart.resize);

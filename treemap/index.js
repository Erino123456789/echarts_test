var dom = document.getElementById('chart-container');
var myChart = echarts.init(dom, null, {
  renderer: 'canvas',
  useDirtyRect: false
});
var app = {};

var option;

myChart.showLoading();
const household_america_2012 = 113616229;
$.get(
  './obama_budget_proposal_2012.json',
  function (obama_budget_2012) {
    myChart.hideLoading();
    const visualMin = -100;
    const visualMax = 100;
    const visualMinBound = -40;
    const visualMaxBound = 40;
    convertData(obama_budget_2012);
    function convertData(originList) {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < originList.length; i++) {
        let node = originList[i];
        if (node) {
          let value = node.value;
          value[2] != null && value[2] < min && (min = value[2]);
          value[2] != null && value[2] > max && (max = value[2]);
        }
      }
      for (let i = 0; i < originList.length; i++) {
        let node = originList[i];
        if (node) {
          let value = node.value;
          // Scale value for visual effect
          if (value[2] != null && value[2] > 0) {
            value[3] = echarts.number.linearMap(
              value[2],
              [0, max],
              [visualMaxBound, visualMax],
              true
            );
          } else if (value[2] != null && value[2] < 0) {
            value[3] = echarts.number.linearMap(
              value[2],
              [min, 0],
              [visualMin, visualMinBound],
              true
            );
          } else {
            value[3] = 0;
          }
          if (!isFinite(value[3])) {
            value[3] = 0;
          }
          if (node.children) {
            convertData(node.children);
          }
        }
      }
    }
    function isValidNumber(num) {
      return num != null && isFinite(num);
    }
    myChart.setOption(
      (option = {
        title: {
          left: 'center',
          text: 'Gradient Mapping',
          subtext: 'Growth > 0: green; Growth < 0: red; Growth = 0: grey'
        },
        tooltip: {
          formatter: function (info) {
            let value = info.value;
            let amount = value[0];
            amount = isValidNumber(amount)
              ? echarts.format.addCommas(amount * 1000) + '$'
              : '-';
            let amount2011 = value[1];
            amount2011 = isValidNumber(amount2011)
              ? echarts.format.addCommas(amount2011 * 1000) + '$'
              : '-';
            let change = value[2];
            change = isValidNumber(change) ? change.toFixed(2) + '%' : '-';
            return [
              '<div class="tooltip-title">' +
                echarts.format.encodeHTML(info.name) +
                '</div>',
              '2012 Amount: &nbsp;&nbsp;' + amount + '<br>',
              '2011 Amount: &nbsp;&nbsp;' + amount2011 + '<br>',
              'Change From 2011: &nbsp;&nbsp;' + change
            ].join('');
          }
        },
        series: [
          {
            name: 'ALL',
            top: 80,
            type: 'treemap',
            label: {
              show: true,
              formatter: '{b}'
            },
            itemStyle: {
              borderColor: 'black'
            },
            visualMin: visualMin,
            visualMax: visualMax,
            visualDimension: 3,
            levels: [
              {
                itemStyle: {
                  borderWidth: 3,
                  borderColor: '#333',
                  gapWidth: 3
                }
              },
              {
                color: ['#942e38', '#aaa', '#269f3c'],
                colorMappingBy: 'value',
                itemStyle: {
                  gapWidth: 1
                }
              }
            ],
            data: obama_budget_2012
          }
        ]
      })
    );
  }
);

if (option && typeof option === 'object') {
  myChart.setOption(option);
}

window.addEventListener('resize', myChart.resize);
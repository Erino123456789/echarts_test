var dom = document.getElementById('chart-container');
var myChart = echarts.init(dom, null, {
  renderer: 'canvas',
  useDirtyRect: false
});
var app = {};

var option;

myChart.showLoading();
$.get(
  './kospi_data.json',
  function (kospi_data) {
    myChart.hideLoading();
    const visualMin = -100;
    const visualMax = 100;
    const visualMinBound = -40;
    const visualMaxBound = 40;
    convertData(kospi_data);
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
            let now_cap = value[0];
            now_cap = isValidNumber(now_cap)
              ? echarts.format.addCommas(now_cap) + '원'
              : '-';
            let pre_cap = value[1];
            pre_cap = isValidNumber(pre_cap)
              ? echarts.format.addCommas(pre_cap) + '원'
              : '-';
            let now_price = value[1];
            now_price = isValidNumber(now_price)
              ? echarts.format.addCommas(now_price) + '원'
              : '-';
            let pre_price = value[1];
            pre_price = isValidNumber(pre_price)
              ? echarts.format.addCommas(pre_price) + '원'
              : '-';
            let change = value[2];
            change = isValidNumber(change) ? change.toFixed(2) + '%' : '-';
            return [
              '<div class="tooltip-title">' +
                echarts.format.encodeHTML(info.name) +
                '</div>',
              '금일시총: &nbsp;&nbsp;' + now_cap + '<br>',
              '전일시총: &nbsp;&nbsp;' + pre_cap + '<br>',
              '금일종가: &nbsp;&nbsp;' + now_price + '<br>',
              '전일종가: &nbsp;&nbsp;' + pre_price + '<br>',
              '변동율: &nbsp;&nbsp;' + change
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
            data: kospi_data
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

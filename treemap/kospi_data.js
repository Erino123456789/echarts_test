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
          value[4] != null && value[4] < min && (min = value[4]);
          value[4] != null && value[4] > max && (max = value[4]);
        }
      }
      for (let i = 0; i < originList.length; i++) {
        let node = originList[i];
        if (node) {
          let value = node.value;
          // Scale value for visual effect
          if (value[4] != null && value[4] > 0) {
            value[5] = echarts.number.linearMap(
              value[4],
              [0, 5],
              [visualMaxBound, visualMax],
              true
            );
          } else if (value[4] != null && value[4] < 0) {
            value[5] = echarts.number.linearMap(
              value[4],
              [-5, 0],
              [visualMin, visualMinBound],
              true
            );
          } else {
            value[5] = 0;
          }
          if (!isFinite(value[3])) {
            value[5] = 0;
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
          subtext: '업종별 최대/최저치에 따라 색상 차등 부여'
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
            let now_price = value[2];
            now_price = isValidNumber(now_price)
              ? echarts.format.addCommas(now_price) + '원'
              : '-';
            let pre_price = value[3];
            pre_price = isValidNumber(pre_price)
              ? echarts.format.addCommas(pre_price) + '원'
              : '-';
            let change = value[4];
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
            upperLabel: {
              show: true,
              color: '#fff'
            },
            breadcrumb: {
              show: false
            },
            labelLayout: function (params) {
              if (params.rect.width < 5 || params.rect.height < 5) {
                  return {  fontSize: 0  };
              }
              return {
                  fontSize: Math.min(Math.sqrt(params.rect.width * params.rect.height) / 10, 20)
              };
            },
            label: {
              show: true,
              formatter: '{b}'
            },
            itemStyle: {
              borderColor: 'black'
            },
            visualMin: visualMin,
            visualMax: visualMax,
            visualDimension: 5,
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

window.addEventListener('resize', myChart.resize);
if (option && typeof option === 'object') {
  myChart.setOption(option);
}

let currentFilename; // 현재 파일명을 저장할 변수

function loadJsonList(type) {
    const lowerType = type.toLowerCase(); // Convert type to lowercase
    const fileName = lowerType === 'kospi' ? 'kospi_json_list.json' : 'kosdaq_json_list.json';
    $.getJSON(fileName, function(data) {
        const buttonContainer = $('#json-button-container');
        buttonContainer.empty(); // 이전 버튼 제거
        data.forEach(item => {
            const button = $('<button></button>')
                .text(item.name)
                .click(() => {
                    loadData(lowerType, item.filename); // index.js로 type과 filename 전달
                    currentFilename = item.filename; // 현재 파일명 저장
                    document.getElementById('slider-container').style.display = 'block'; // 슬라이더 보이기
                });
            buttonContainer.append(button);
        });
    }).fail(function() {
        alert('JSON 파일을 불러오는 데 실패했습니다. 파일 이름이 올바른지 확인하세요.');
    });
}

function loadData(type, filename) {
    var dom = document.getElementById('chart-container');
    var myChart = echarts.init(dom, null, {
        renderer: 'canvas',
        useDirtyRect: false
    });
    var option;

  myChart.showLoading();
  $.get(
    '../data/' + filename,
    function (kospi_data) {
      myChart.hideLoading();
      const visualMin = -5;
      const visualMax = 5;
      const visualMinBound = -1;
      const visualMaxBound = 1;
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
            subtext: '테스트 중'
          },
          tooltip: {
            formatter: function (info) {
              if (info.data.children) {
                let totalValue = isValidNumber(info.data.value) ? echarts.format.addCommas(info.data.value) + ' 백만원' : '-';
                return [
                  '<div class="tooltip-title"><b>' + echarts.format.encodeHTML(info.name) + '</b></div>',
                  '총 합계: &nbsp;&nbsp;' + totalValue
                ].join('');
              } else {
                let value = info.value;
                let now_cap = value[0];
                now_cap = isValidNumber(now_cap)
                  ? echarts.format.addCommas(now_cap) + ' 백만원'
                  : '-';
                let pre_cap = value[1];
                pre_cap = isValidNumber(pre_cap)
                  ? echarts.format.addCommas(pre_cap) + ' 백만원'
                  : '-';
                let now_price = value[2];
                now_price = isValidNumber(now_price)
                  ? echarts.format.addCommas(now_price) + ' 원'
                  : '-';
                let pre_price = value[3];
                pre_price = isValidNumber(pre_price)
                  ? echarts.format.addCommas(pre_price) + ' 원'
                  : '-';
                let change = value[4];
                change = isValidNumber(change) ? change.toFixed(2) + ' %' : '-';
                return [
                  '<div class="tooltip-title"><b>' +
                    echarts.format.encodeHTML(info.name) +
                    '</b></div>',
                  '금일시총: &nbsp;&nbsp;' + now_cap + '<br>',
                  '전일시총: &nbsp;&nbsp;' + pre_cap + '<br>',
                  '금일종가: &nbsp;&nbsp;' + now_price + '<br>',
                  '전일종가: &nbsp;&nbsp;' + pre_price + '<br>',
                  '변동율: &nbsp;&nbsp;' + change
                ].join('');
              }
            }
          },
          series: [
            {
              name: `${type.toUpperCase()}`,
              top: 80,
              type: 'treemap',
              animation: true,
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
                formatter: function(params) {
                  if (params.data.children) {
                    return `${params.name}`; // 상위 항목은 일반 텍스트
                  } else {
                    return `${params.name}\n${params.value[4]}%`; // 하위 항목은 굵게 표시
                  }
                },
                color: '#fff',  // 텍스트 색상 설정
                textShadowColor: 'black',     // 그림자 색상 설정 (테두리 효과용)
                textShadowBlur: 4,            // 그림자 블러 정도 설정
                textShadowOffsetX: 0,
                textShadowOffsetY: 0,
                fontWeight: 'bold'
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
                  color: [
                      '#942e38',
                      '#98464e',
                      '#9c5f65',
                      '#a1787c',
                      '#a59193',
                      '#aaaaaa',
                      '#8fa793',
                      '#75a57d',
                      '#5aa368',
                      '#40a151',
                      '#269f3c'
                  ],
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
}

// 슬라이더의 이벤트 리스너 추가
document.getElementById('time-slider').addEventListener('input', function() {
    const sliderValue = parseInt(this.value, 10);
    
    // 파일명에서 기본 파일명과 날짜 부분 추출
    const baseFilename = currentFilename.substring(0, currentFilename.length - 10); // "kosdaq_map_data_"와 ".json"을 제외한 부분
    const baseDate = currentFilename.slice(-10, -5); // 원래 날짜 부분인 "20241101" 추출
    let newFilename;

    if (sliderValue === 26) {
        newFilename = currentFilename;
    } else {
        // 슬라이더 값에 따라 15분씩 증가
        const totalMinutes = 15 + (sliderValue - 1) * 15; // 슬라이더가 1일 때 09:30부터 시작
        
        // 시와 분 계산
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        // 새로운 시간 문자열 생성
        const hourString = (9 + hour).toString().padStart(2, '0'); // 09시부터 시작
        const minuteString = minute.toString().padStart(2, '0');
        const timeString = `${baseDate}${hourString}${minuteString}`; // 날짜 + 시 + 분

        newFilename = `${baseFilename}${timeString}.json`; // 새로운 파일명 생성
    }

    // 새 파일로 데이터 로드
    loadData(currentFilename.toLowerCase().includes('kospi') ? 'KOSPI' : 'KOSDAQ', newFilename);
});

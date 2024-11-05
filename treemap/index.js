let currentFilename; // 현재 파일명을 저장할 변수
let allData = []; // 검색기능용, 차트 데이터 저장을 위한 변수
let initialLoad = true; // 첫 로딩 여부를 확인하는 변수

function calculateSliderIndex(timeString) {
    // timeString은 "HHMM" 형식의 문자열로, 예를 들어 "0920", "1030" 등의 값을 가짐
    const hours = parseInt(timeString.slice(0, 2)); // 시간 부분 추출
    const minutes = parseInt(timeString.slice(2, 4)); // 분 부분 추출

    // 기본 시간인 09:20이 슬라이더의 시작(인덱스 0)에 해당
    const baseHours = 9;
    const baseMinutes = 20;

    // 총 분으로 변환하여 슬라이더 인덱스를 계산
    const totalMinutes = (hours * 60 + minutes) - (baseHours * 60 + baseMinutes);
    
    // 10분 단위로 슬라이더 인덱스 계산
    return Math.floor(totalMinutes / 10);
}

function getNearestPreviousTime() {
    const currentTime = new Date();
    
    // KST로 변환
    const utcOffset = 9 * 60; // 한국은 UTC+9
    const localTimeInMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes() + utcOffset;

    let hours = Math.floor(localTimeInMinutes / 60) % 24; // 24시간 형식으로
    let minutes = localTimeInMinutes % 60;

    // 10분 단위로 내림
    minutes = Math.floor(minutes / 10) * 10;

    // 15:50 이후라면 원래 파일명으로 돌아감
    if (hours < 9 || (hours === 9 && minutes < 20) || (hours === 15 && minutes > 50)) {
        return null; // 원래 파일명 반환을 위해 null 반환
    }
    console.log(`${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`);
    // 시간을 문자열 형태로 변환하여 반환
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
}

function updateTimeDisplay(sliderValue) {
    let timeString;
    if (sliderValue === 0) {
        timeString = "09:20"; // 슬라이더가 0일 때
    } else if (sliderValue >= 39) {
        timeString = "15:50"; // 슬라이더가 끝에 있을 때
    } else {
        // 슬라이더가 1~36일 때
        const time = new Date();
        time.setHours(9, 20); // 기본 시간
        time.setMinutes(time.getMinutes() + sliderValue * 10); // 슬라이더 값에 따라 분 추가
        timeString = time.toTimeString().slice(0, 5); // HH:MM 형태로 변환
    }
    console.log(`슬라이더 값: ${sliderValue}, 시간: ${timeString}`);
    // 여기서 timeString을 화면에 표시하는 로직 추가 가능
}

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

                    currentFilename = item.filename;
                    document.getElementById('slider-container').style.display = 'block';
                    
                    // 첫 시도: 기본 파일명으로 데이터 불러오기
                    loadData(type, currentFilename, true, () => {
                        // 불러오기에 실패하면 슬라이더에 맞춘 파일명으로 재시도
                        const nearestTime = getNearestPreviousTime();
                        const sliderIndex = nearestTime ? calculateSliderIndex(nearestTime) : 39;
                        
                        $('#time-slider').val(sliderIndex);
                        updateTimeDisplay(sliderIndex);
                        
                        const initialFilename = getFilenameForSliderIndex(sliderIndex);
                        loadData(type, initialFilename, false); 
                    });
                });
            buttonContainer.append(button);
        });
    }).fail(function() {
        alert('JSON 파일을 불러오는 데 실패했습니다. 파일 이름이 올바른지 확인하세요.');
    });
}

function loadData(type, filename, showLoading = true, fallbackCallback = null) {
    var dom = document.getElementById('chart-container');
    var myChart = echarts.init(dom, null, {
        renderer: 'canvas',
        useDirtyRect: false
    });
    var option;
  
    if (showLoading && initialLoad) {
        myChart.showLoading();
    }
  
    const nearestTime = getNearestPreviousTime();
    const currentTime = new Date();
    const hours = currentTime.getUTCHours() + 9; // KST로 변환
    const minutes = currentTime.getUTCMinutes();

    // 현재 시간 체크 (09:19 이전 또는 15:30 이후)
    let finalFilename;
    if ((hours === 9 && minutes < 20) || (hours === 15 && minutes > 30)) {
        finalFilename = filename; // 원래 파일명 사용
    } else if (nearestTime) {
        finalFilename = filename.substring(0, filename.length - 8) + nearestTime + '.json'; // 날짜 부분 변경
    } else {
        finalFilename = filename; // 원래 파일명 사용
    }
  
  $.get(
    '../data/' + filename,
    function (kospi_data) {
      allData = kospi_data; // 검색기능용, 전체 데이터 저장
      if (initialLoad) {
        myChart.hideLoading();
        initialLoad = false; // 이후부터는 로딩 화면을 표시하지 않음
      }
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
  ).fail(function() {
        if (fallbackCallback) {
            fallbackCallback(); // 데이터 로드 실패 시 콜백 실행
        } else {
            // 기본 파일명 불러오기 실패 시 처리
            console.error(`Failed to load: ${filename}`);
            const nearestTime = getNearestPreviousTime();
            const sliderIndex = nearestTime ? calculateSliderIndex(nearestTime) : 39;

            // 슬라이더를 가장 가까운 시간대로 이동
            $('#time-slider').val(sliderIndex);
            updateTimeDisplay(sliderIndex);
            const newFilename = getFilenameForSliderIndex(sliderIndex);

            // 다시 시도
            loadData(type, newFilename, false, () => {
                // 만약 실패하면 한 칸 왼쪽으로 이동하여 재시도
                let newSliderIndex = Math.max(sliderIndex - 1, 0); // 0보다 작아지지 않도록
                $('#time-slider').val(newSliderIndex);
                updateTimeDisplay(newSliderIndex);
                const fallbackFilename = getFilenameForSliderIndex(newSliderIndex);
                loadData(type, fallbackFilename, false); // 한 칸 왼쪽으로 재시도
            });
        }
    });
    
    // 검색어에 따른 데이터 필터링 함수
    $('#search-input').on('input', function() {
        const query = $(this).val().toLowerCase(); // 입력된 검색어
    
        // 재귀적으로 하위 항목을 포함하여 필터링하는 함수
        function filterData(data) {
            return data.reduce((acc, item) => {
                // 상위 항목이 검색어와 일치하는 경우
                if (item.name.toLowerCase().includes(query)) {
                    acc.push(item); // 전체 항목 추가
                } else if (item.children) {
                    // 하위 항목에 대해 재귀적으로 필터링
                    const filteredChildren = filterData(item.children);
                    if (filteredChildren.length) {
                        acc.push({
                            ...item, // 상위 항목 정보 유지
                            children: filteredChildren // 필터링된 하위 항목 추가
                        });
                    }
                }
                return acc;
            }, []);
        }
    
        const filteredData = filterData(allData); // 필터링된 데이터
    
        // 필터링된 데이터를 차트에 업데이트
        myChart.setOption({
            series: [{
                data: filteredData
            }]
        });
    });
    
  window.addEventListener('resize', myChart.resize);
  if (option && typeof option === 'object') {
    myChart.setOption(option);
  }
}

// 슬라이더 인덱스에 맞는 파일명 생성 함수
function getFilenameForSliderIndex(sliderIndex) {
    const baseFilename = currentFilename.substring(0, currentFilename.length - 10); // "kosdaq_map_data_"와 ".json" 제외
    const baseDate = currentFilename.slice(-10, -5); // 날짜 부분 추출 (예: "20241101")

    if (sliderIndex === 39) {
        return currentFilename; // 슬라이더 인덱스가 39일 때는 기본 파일명
    }

    const totalMinutes = 20 + (sliderIndex * 10);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hourString = (9 + hour).toString().padStart(2, '0');
    const minuteString = minute.toString().padStart(2, '0');
    const timeString = `${baseDate}${hourString}${minuteString}`; // 날짜 + 시 + 분

    return `${baseFilename}${timeString}.json`; // 생성된 파일명 반환
}

// 슬라이더 이동 시 파일명 변경 및 데이터 로드
document.getElementById('time-slider').addEventListener('input', function() {
    const sliderValue = parseInt(this.value);
    updateTimeDisplay(sliderValue);

    const newFilename = getFilenameForSliderIndex(sliderValue); // 슬라이더 인덱스에 맞는 파일명 계산
    // 슬라이더 이동 시에는 로딩 화면을 표시하지 않음
    loadData(currentFilename.toLowerCase().includes('kospi') ? 'KOSPI' : 'KOSDAQ', newFilename, false);
});

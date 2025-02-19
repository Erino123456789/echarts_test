let currentFilename; // 현재 파일명을 저장할 변수
let allData = []; // 검색기능용, 차트 데이터 저장을 위한 변수
let processedData = [];
let initialLoad = true; // 첫 로딩 여부를 확인하는 변수
let cachedFiles = {}; // 캐시 데이터 저장용 객체 추가
let capturing = false; // 캡처 진행 상태를 추적
// 기존 변수 아래에 추가
let currentFilters = {
  searchQuery: "",
  depth: 3,
  marketCap: { operator: null, value: null },
  changeRate: { operator: null, value: null },
};

function togglePanel() {
  const leftPanel = document.getElementById("left-panel");
  const overlay = document.getElementById("overlay");
  const menuButton = document.getElementById("menu-button");

  leftPanel.classList.toggle("open");
  overlay.classList.toggle("show");
  menuButton.classList.toggle("open");
}

function adjustTimeByMinutes(filename, subtractMinutes) {
  const parts = filename.split("_");
  let datePart = parts[3].slice(0, 8); // '20241106' 추출
  let timePart = parts[3].split(".")[0].slice(8); // '0920' 또는 없는 경우 빈 문자열

  // 시간 정보가 없으면 기본값 '1540' 설정
  if (timePart.length < 4) {
    timePart = "1540";
    subtractMinutes = 0; // 기본 시간 사용 시 시간 조정 불필요
  }

  let hours = parseInt(timePart.slice(0, 2), 10); // '09' -> 9
  let minutes = parseInt(timePart.slice(2, 4), 10); // '20' -> 20

  // 시간에서 지정한 분 단위 빼기
  minutes -= subtractMinutes;
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
    if (hours < 0) {
      hours = 23;

      // 날짜 조정 (0시 이전인 경우 하루 전 날짜로 이동)
      const year = parseInt(datePart.slice(0, 4), 10);
      const month = parseInt(datePart.slice(4, 6), 10);
      const day = parseInt(datePart.slice(6, 8), 10);

      const newDate = new Date(year, month - 1, day - 1);
      datePart = `${newDate.getFullYear()}${String(
        newDate.getMonth() + 1
      ).padStart(2, "0")}${String(newDate.getDate()).padStart(2, "0")}`;
    }
  }

  // 포맷된 날짜와 시간
  const formattedDate = `${datePart.slice(0, 4)}.${datePart.slice(
    4,
    6
  )}.${datePart.slice(6, 8)}`;
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
  return `${formattedDate}. ${formattedTime}`;
}

function loadAndCacheData(filePrefix, date) {
  const timeSuffixes = [];

  // 09:20부터 15:50까지 10분 간격으로 접미사를 추가
  for (let hour = 9; hour <= 15; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const timeString = `${hour.toString().padStart(2, "0")}${minute
        .toString()
        .padStart(2, "0")}`;
      if (hour === 9 && minute < 20) continue; // 09:20 이전은 제외
      if (hour === 15 && minute > 40) break; // 15:40 이후는 제외
      timeSuffixes.push(timeString);
    }
  }

  // 각 시간별 파일을 다운로드하여 캐시에 저장
  timeSuffixes.forEach((timeSuffix) => {
    const filename = `${filePrefix}_${date}${timeSuffix}.json`;

    // 파일이 이미 캐시에 있는지 확인 후 중복 로드 방지
    if (cachedFiles[date] && cachedFiles[date][timeSuffix]) {
      console.log(`이미 캐시에 저장된 파일: ${filename}`);
      return;
    }

    $.getJSON(`../data/${filename}`, function (data) {
      if (!cachedFiles[date]) cachedFiles[date] = {};
      cachedFiles[date][timeSuffix] = data;
    }).fail(function () {
      console.warn(`Failed to load: ${filename}`); // 실패 시 경고 메시지
    });
  });
}

function loadDataFromCache(filePrefix, date, timeSuffix) {
  if (timeSuffix > "1540") {
    console.warn(
      `15:50 이후 데이터 요청 제한: ${filePrefix}_${date}${timeSuffix}.json`
    );
    return; // 15:50 이후 파일 요청 차단
  }
  const data = cachedFiles[date] && cachedFiles[date][timeSuffix];
}

function calculateSliderIndex(timeString) {
  // timeString은 "HHMM" 형식의 문자열로, 예를 들어 "0920", "1030" 등의 값을 가짐
  const hours = parseInt(timeString.slice(0, 2)); // 시간 부분 추출
  const minutes = parseInt(timeString.slice(2, 4)); // 분 부분 추출

  // 기본 시간인 09:20이 슬라이더의 시작(인덱스 0)에 해당
  const baseHours = 9;
  const baseMinutes = 20;

  // 총 분으로 변환하여 슬라이더 인덱스를 계산
  const totalMinutes = hours * 60 + minutes - (baseHours * 60 + baseMinutes);

  // 10분 단위로 슬라이더 인덱스 계산
  return Math.floor(totalMinutes / 10);
}

function getNearestPreviousTime() {
  const currentTime = new Date();

  // KST로 변환
  const utcOffset = 9 * 60; // 한국은 UTC+9
  const localTimeInMinutes =
    currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes() + utcOffset;

  let hours = Math.floor(localTimeInMinutes / 60) % 24; // 24시간 형식으로
  let minutes = localTimeInMinutes % 60;

  // 10분 단위로 내림
  minutes = Math.floor(minutes / 10) * 10;

  // 15:50 이후라면 원래 파일명으로 돌아감
  if (
    hours < 9 ||
    (hours === 9 && minutes < 20) ||
    (hours === 15 && minutes > 50)
  ) {
    return null; // 원래 파일명 반환을 위해 null 반환
  }
  console.log(
    `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`
  );
  // 시간을 문자열 형태로 변환하여 반환
  return `${hours.toString().padStart(2, "0")}${minutes
    .toString()
    .padStart(2, "0")}`;
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

function handleScreenshot() {
  const screenshotSelect = document.getElementById("screenshot-select");
  const selectedOption = screenshotSelect.value;

  if (selectedOption === "current") {
    // 현재 화면 스크린샷 처리
    captureCurrentScreenshot()
      .then((imgData) => {
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "echarts_screenshot.png";
        link.click();

        // 스크린샷 다운로드 후 옵션 텍스트 변경
        screenshotSelect.options[0].text = "스크린샷"; // 첫 번째 옵션의 텍스트 변경
        screenshotSelect.value = ""; // 기본 선택으로 설정 (아무것도 선택되지 않도록)
      })
      .catch(console.error);
  } else if (selectedOption === "overall") {
    // 전체 흐름 스크린샷 처리 (슬라이더 인덱스 0번부터 끝까지)
    captureOverallFlowScreenshots()
      .then((gifData) => {
        const link = document.createElement("a");
        link.href = gifData;
        link.download = "flow.gif";
        link.click();

        // 스크린샷 다운로드 후 옵션 텍스트 변경
        screenshotSelect.options[0].text = "스크린샷"; // 첫 번째 옵션의 텍스트 변경
        screenshotSelect.value = ""; // 기본 선택으로 설정 (아무것도 선택되지 않도록)
      })
      .catch((error) => {
        console.error("전체 흐름 스크린샷 생성 실패:", error);
      });
  }
}

// 캡처 기능 추가
function captureCurrentScreenshot() {
  const chartContainer = document.getElementById("chart-container");

  return new Promise((resolve, reject) => {
    if (chartContainer) {
      html2canvas(chartContainer, { backgroundColor: null })
        .then(function (canvas) {
          const imgData = canvas.toDataURL("image/png");
          resolve(imgData); // 이미지 데이터를 바로 반환
        })
        .catch(function (error) {
          reject("스크린샷을 찍는 중 오류 발생: " + error);
        });
    } else {
      reject("차트 컨테이너를 찾을 수 없습니다.");
    }
  });
}

function captureOverallFlowScreenshots() {
  return new Promise((resolve, reject) => {
    if (capturing) return; // 이미 캡처 중이면 중지

    capturing = true; // 캡처 중 상태로 설정

    const chartContainer = document.getElementById("chart-container");
    const containerWidth = chartContainer.offsetWidth;
    const containerHeight = chartContainer.offsetHeight;

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: containerWidth,
      height: containerHeight,
      workerScript: "gif.worker.js",
    });

    const totalSlides = 40;
    let currentIndex = 0;

    function captureAndAddFrame() {
      // 슬라이더 값을 변경하고 화면 업데이트 대기
      document.getElementById("time-slider").value = currentIndex;
      document.getElementById("time-slider").dispatchEvent(new Event("input"));

      // 슬라이더 값이 변경된 후 0.2초 뒤에 캡처를 진행
      setTimeout(function () {
        captureCurrentScreenshot()
          .then((imageData) => {
            const img = new Image();
            img.src = imageData;

            img.onload = function () {
              const delayTime = currentIndex === totalSlides - 1 ? 5000 : 500; // 마지막 프레임은 5000ms

              // 프레임 추가
              gif.addFrame(img, { delay: delayTime, copy: true });
              currentIndex++;

              if (currentIndex < totalSlides) {
                captureAndAddFrame(); // 다음 프레임 캡쳐
              } else {
                // GIF 렌더링 완료 후 처리
                gif.on("finished", function (blob) {
                  const gifUrl = URL.createObjectURL(blob);
                  resolve(gifUrl); // GIF URL 반환
                  capturing = false; // 캡처 완료 후 false로 설정
                });
                gif.render(); // GIF 렌더링 시작
              }
            };
          })
          .catch((error) => {
            reject("스크린샷 캡쳐 실패: " + error); // 캡쳐 실패 시
            capturing = false; // 캡처 완료 후 false로 설정
          });
      }, 400); // 0.4초 뒤에 캡처 진행
    }

    // 첫 번째 프레임 캡처도 0.2초 뒤에 시작
    setTimeout(captureAndAddFrame, 200);
  });
}

// debounce 함수 정의
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// loadJsonList 함수 정의 (Promise 사용)
function loadJsonList(type) {
  return new Promise((resolve, reject) => {
    const lowerType = type.toLowerCase(); // Convert type to lowercase
    const fileName =
      lowerType === "kospi" ? "kospi_json_list.json" : "kosdaq_json_list.json";
    // 캐시를 방지하기 위해 timestamp를 쿼리 문자열로 추가
    const urlWithTimestamp = fileName + "?_=" + new Date().getTime();

    $.getJSON(urlWithTimestamp, function (data) {
      const buttonContainer = $("#json-button-container");
      buttonContainer.empty(); // 이전 버튼 제거

      // 버튼들을 추가
      data.forEach((item) => {
        const button = $("<button></button>")
          .text(item.name) // 버튼 텍스트 설정
          .click(() => {
            currentFilename = item.filename; // 현재 파일명 저장
            const selectedDate = currentFilename.slice(-13, -5); // 날짜 추출
            const filePrefix = currentFilename.split("_")[0] + "_map_data"; // kosdaq_map_data 또는 kospi_map_data 형식으로 파일명 설정
            loadAndCacheData(filePrefix, selectedDate); // 해당 날짜의 모든 JSON 파일 캐시
            document.getElementById("slider-container").style.display = "block";
            loadDataFromCache(filePrefix, selectedDate, "0920"); // 초기 데이터 로드
            document.getElementById("slider-container").style.display = "block";

            // 첫 시도: 기본 파일명으로 데이터 불러오기
            loadData(type, currentFilename, true, () => {
              // 불러오기에 실패하면 슬라이더에 맞춘 파일명으로 재시도
              const nearestTime = getNearestPreviousTime();
              const sliderIndex = nearestTime
                ? calculateSliderIndex(nearestTime)
                : 39;

              $("#time-slider").val(sliderIndex);
              updateTimeDisplay(sliderIndex);

              const initialFilename = getFilenameForSliderIndex(sliderIndex);
              loadData(type, initialFilename, false);
            });
          });

        buttonContainer.append(button);
      });

      // Promise 완료 후 data 반환
      resolve(data);
    }).fail(function () {
      reject("JSON 파일을 불러오는 데 실패했습니다.");
    });
  });
}

function loadData(type, filename, showLoading = true, fallbackCallback = null) {
  var dom = document.getElementById("chart-container");
  var myChart = echarts.init(dom, null, {
    renderer: "canvas",
    useDirtyRect: false,
  });
  var option;

  if (showLoading && initialLoad) {
    myChart.showLoading();
  }

  const nearestTime = getNearestPreviousTime();
  const currentTime = new Date();
  const hours = currentTime.getUTCHours() + 9; // KST로 변환
  const minutes = currentTime.getUTCMinutes();

  $.get("../data/" + filename, function (kospi_data) {
    allData = kospi_data; // 검색기능용, 전체 데이터 저장
    processedData = groupJsonData(kospi_data); // JSON 데이터 가공
    console.log(processedData);
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
    const formattedTitleDate = adjustTimeByMinutes(filename, 20);
    myChart.setOption(
      (option = {
        title: {
          text: `${type.toUpperCase()} - ${formattedTitleDate}`,
          left: "center",
        },
        tooltip: {
          formatter: function (info) {
            var value = info.value;
            if (window.isRangeSearch) {
              // 범위 검색인 경우
              if (info.data.children) {
                // 깊이가 1,2단계 그룹 노드인 경우: 시작일 시총, 종료일 시총, 변동율만 표시
                let start_cap = isValidNumber(value[0])
                  ? echarts.format.addCommas(value[0]) + " 백만원"
                  : "-";
                let end_cap = isValidNumber(value[1])
                  ? echarts.format.addCommas(value[1]) + " 백만원"
                  : "-";
                let change = isValidNumber(value[4])
                  ? value[4].toFixed(2) + " %"
                  : "-";
                return [
                  '<div class="tooltip-title"><b>' +
                    echarts.format.encodeHTML(info.name) +
                    "</b></div>",
                  "시작일 시총: " + start_cap + "<br>",
                  "종료일 시총: " + end_cap + "<br>",
                  "변동율: " + change,
                ].join("");
              } else {
                // 깊이가 3단계 개별종목인 경우: 시작일 시총, 종료일 시총, 시작일 주가, 종료일 주가, 변동율 표시
                let start_cap = isValidNumber(value[0])
                  ? echarts.format.addCommas(value[0]) + " 백만원"
                  : "-";
                let end_cap = isValidNumber(value[1])
                  ? echarts.format.addCommas(value[1]) + " 백만원"
                  : "-";
                let start_price = isValidNumber(value[2])
                  ? echarts.format.addCommas(value[2]) + " 원"
                  : "-";
                let end_price = isValidNumber(value[3])
                  ? echarts.format.addCommas(value[3]) + " 원"
                  : "-";
                let change = isValidNumber(value[4])
                  ? value[4].toFixed(2) + " %"
                  : "-";
                return [
                  '<div class="tooltip-title"><b>' +
                    echarts.format.encodeHTML(info.name) +
                    "</b></div>",
                  "시작일 시총: " + start_cap + "<br>",
                  "종료일 시총: " + end_cap + "<br>",
                  "시작일 주가: " + start_price + "<br>",
                  "종료일 주가: " + end_price + "<br>",
                  "변동율: " + change,
                ].join("");
              }
            } else {
              // 단일 일자 검색 (기존 방식)
              if (info.data.children) {
                let now_cap = isValidNumber(value[0])
                  ? echarts.format.addCommas(value[0]) + " 백만원"
                  : "-";
                let pre_cap = isValidNumber(value[1])
                  ? echarts.format.addCommas(value[1]) + " 백만원"
                  : "-";
                let change = isValidNumber(value[4])
                  ? value[4].toFixed(2) + " %"
                  : "-";
                return [
                  '<div class="tooltip-title"><b>' +
                    echarts.format.encodeHTML(info.name) +
                    "</b></div>",
                  "전일시총: " + now_cap + "<br>",
                  "현재시총: " + pre_cap + "<br>",
                  "변동율: " + change,
                ].join("");
              } else {
                let now_cap = isValidNumber(value[0])
                  ? echarts.format.addCommas(value[0]) + " 백만원"
                  : "-";
                let pre_cap = isValidNumber(value[1])
                  ? echarts.format.addCommas(value[1]) + " 백만원"
                  : "-";
                let now_price = isValidNumber(value[2])
                  ? echarts.format.addCommas(value[2]) + " 원"
                  : "-";
                let pre_price = isValidNumber(value[3])
                  ? echarts.format.addCommas(value[3]) + " 원"
                  : "-";
                let change = isValidNumber(value[4])
                  ? value[4].toFixed(2) + " %"
                  : "-";
                return [
                  '<div class="tooltip-title"><b>' +
                    echarts.format.encodeHTML(info.name) +
                    "</b></div>",
                  "전일시총: " + now_cap + "<br>",
                  "현재시총: " + pre_cap + "<br>",
                  "전일주가: " + now_price + "<br>",
                  "현재주가: " + pre_price + "<br>",
                  "변동율: " + change,
                ].join("");
              }
            }
          },
        },
        backgroundColor: "#f8f9fa",
        visualMap: {
          type: "continuous", // 연속형 색상 매핑
          min: -5, // 최소 퍼센트 값
          max: 5, // 최대 퍼센트 값
          dimension: 4, // value 배열에서 다섯 번째 값을 기준으로 색상 매핑
          inRange: {
            color: ["#942e38", "#aaaaaa", "#269f3c"], // -5, 0, +5에 대응하는 색상
          },
          show: true, // 범례 표시
        },
        series: [
          {
            name: `${type.toUpperCase()}`,
            width: "100%",
            height: "100%" - "30px",
            top: 30,
            left: 0,
            right: 0,
            bottom: 0,
            leafDepth: 3,
            drillDownIcon: "",
            type: "treemap",
            animation: true,
            upperLabel: {
              show: true,
              color: "#fff",
              borderWidth: 1, // 경계선 추가
              fontWeight: "bold",
              formatter: function (info) {
                let name = info.name; // 이름
                return [name].join("");
              },
            },
            breadcrumb: {
              show: false,
            },
            labelLayout: function (params) {
              if (params.rect.width < 5 || params.rect.height < 5) {
                return { fontSize: 0 };
              }
              return {
                fontSize: Math.min(
                  Math.sqrt(params.rect.width * params.rect.height) / 10,
                  20
                ),
              };
            },
            label: {
              show: true,
              formatter: function (params) {
                let changeleaf = params.value[4];
                changeleaf = isValidNumber(changeleaf)
                  ? changeleaf.toFixed(2) + " %"
                  : "-";
                return `${params.name}\n${changeleaf}`; // 하위 항목은 굵게 표시
              },
              color: "#fff", // 텍스트 색상 설정
              textShadowColor: "black", // 그림자 색상 설정 (테두리 효과용)
              textShadowBlur: 4, // 그림자 블러 정도 설정
              textShadowOffsetX: 0,
              textShadowOffsetY: 0,
              fontWeight: "bold",
            },
            itemStyle: {
              borderColor: "black",
            },
            visualMin: visualMin,
            visualMax: visualMax,
            visualDimension: 5,
            levels: [
              {
                itemStyle: {
                  borderWidth: 1,
                  gapWidth: 3,
                  borderColor: "#333",
                },
              },
              {
                itemStyle: {
                  borderWidth: 2,
                  gapWidth: 1,
                  borderColor: "#555",
                },
              },
              {
                itemStyle: {
                  borderWidth: 2,
                  borderColor: "#777",
                },
              },
            ],
            data: processedData,
          },
        ],
      })
    );
  }).fail(function () {
    if (fallbackCallback) {
      fallbackCallback(); // 데이터 로드 실패 시 콜백 실행
    } else {
      // 기본 파일명 불러오기 실패 시 처리
      console.error(`Failed to load: ${filename}`);
      const nearestTime = getNearestPreviousTime();
      const sliderIndex = nearestTime ? calculateSliderIndex(nearestTime) : 39;

      // 슬라이더를 가장 가까운 시간대로 이동
      $("#time-slider").val(sliderIndex);
      updateTimeDisplay(sliderIndex);
      const newFilename = getFilenameForSliderIndex(sliderIndex);

      // 다시 시도
      loadData(type, newFilename, false, () => {
        // 만약 실패하면 한 칸 왼쪽으로 이동하여 재시도
        let newSliderIndex = Math.max(sliderIndex - 1, 0); // 0보다 작아지지 않도록
        $("#time-slider").val(newSliderIndex);
        updateTimeDisplay(newSliderIndex);
        const fallbackFilename = getFilenameForSliderIndex(newSliderIndex);
        loadData(type, fallbackFilename, false); // 한 칸 왼쪽으로 재시도
      });
    }
  });

  /*
  // 검색어에 따른 데이터 필터링 함수
  $("#search-input").on(
    "input",
    debounce(function () {
      const query = $(this).val().toLowerCase();

      function filterData(data) {
        return data.reduce((acc, item) => {
          if (item.name.toLowerCase().includes(query)) {
            acc.push(item);
          } else if (item.children) {
            const filteredChildren = filterData(item.children);
            if (filteredChildren.length) {
              acc.push({ ...item, children: filteredChildren });
            }
          }
          return acc;
        }, []);
      }

      const filteredData = filterData(processedData);
      myChart.setOption({ series: [{ data: filteredData }] });
    }, 300)
  ); // 300ms의 딜레이 적용
  */

  /*
  // 깊이 변경 함수
  $("#depth-select").on("change", function () {
    const selectedDepth = parseInt($(this).val(), 10); // 선택된 값 가져오기

    if (!isNaN(selectedDepth)) {
      myChart.setOption({
        series: [
          {
            leafDepth: selectedDepth, // 선택된 깊이 적용
          },
        ],
      });
    }
  });
  */

  window.addEventListener(
    "resize",
    debounce(() => myChart.resize(), 200)
  ); // 200ms 딜레이

  if (option && typeof option === "object") {
    myChart.setOption(option);
  }
}

// 슬라이더 인덱스에 맞는 파일명 생성 함수
function getFilenameForSliderIndex(sliderIndex) {
  const baseFilename = currentFilename.substring(
    0,
    currentFilename.length - 10
  );
  const baseDate = currentFilename.slice(-10, -5);

  // 슬라이더 인덱스가 39(15:50)을 넘기면 원래 파일 호출
  if (sliderIndex >= 39) {
    return currentFilename; // 15:50 이상은 호출하지 않음
  }

  const totalMinutes = 20 + sliderIndex * 10;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hourString = (9 + hour).toString().padStart(2, "0");
  const minuteString = minute.toString().padStart(2, "0");
  const timeString = `${baseDate}${hourString}${minuteString}`;

  return `${baseFilename}${timeString}.json`;
}

// 슬라이더 이동 시 파일명 변경 및 데이터 로드
document.getElementById("time-slider").addEventListener("input", function () {
  const sliderValue = parseInt(this.value);
  updateTimeDisplay(sliderValue); // 시간 표시 업데이트

  const newFilename = getFilenameForSliderIndex(sliderValue); // 슬라이더 인덱스에 맞는 파일명 계산
  console.log("새로운 파일명: ", newFilename); // 새로운 파일명이 콘솔에 출력되도록 확인

  // 슬라이더 값에 맞춰 데이터를 로드하는 부분
  loadData(
    currentFilename.toLowerCase().includes("kospi") ? "KOSPI" : "KOSDAQ",
    newFilename,
    false // 슬라이더 인덱스가 변경될 때는 로딩 화면을 표시하지 않음
  );
});

// window.onload 내부에 추가
window.onload = function () {
  initializeFilters();
  loadJsonList("kospi")
    .then((data) => {
      if (data && data.length > 0) {
        // 첫 번째 데이터 항목을 직접 사용하여 초기 차트를 로드합니다.
        const firstItem = data[0];
        currentFilename = firstItem.filename;
        const selectedDate = currentFilename.slice(-13, -5);
        const filePrefix = currentFilename.split("_")[0] + "_map_data";

        // JSON 파일들을 캐시에 로드
        loadAndCacheData(filePrefix, selectedDate);
        document.getElementById("slider-container").style.display = "block";

        // 기본 파일명으로 데이터 로드 (초기 로딩)
        loadData("KOSPI", currentFilename, true, () => {
          // 데이터 로드 실패 시, 슬라이더 값을 기준으로 재시도
          const nearestTime = getNearestPreviousTime();
          const sliderIndex = nearestTime
            ? calculateSliderIndex(nearestTime)
            : 39;
          $("#time-slider").val(sliderIndex);
          updateTimeDisplay(sliderIndex);
          const initialFilename = getFilenameForSliderIndex(sliderIndex);
          loadData("KOSPI", initialFilename, false);
        });
      }
    })
    .catch((error) => {
      console.error("loadJsonList 오류:", error);
    });
};

// 그룹과 카테고리 매핑
const categoryGroups = {
  자동차: ["자동차", "자동차부품"],
  반도체: ["반도체와반도체장비"],
  은행: ["은행", "카드"],
  헬스케어: [
    "건강관리업체및서비스",
    "건강관리장비와용품",
    "생명과학도구및서비스",
    "생물공학",
    "제약",
    "건강관리기술",
  ],
  철강: ["철강", "비철금속"],
  건설: ["건설", "건축자재"],
  증권: ["증권", "창업투자"],
  IT: [
    "IT서비스",
    "소프트웨어",
    "통신장비",
    "인터넷과카탈로그소매",
    "무선통신서비스",
    "다각화된통신서비스",
  ],
  "미디어&엔터테인먼트": [
    "게임엔터테인먼트",
    "방송과엔터테인먼트",
    "양방향미디어와서비스",
    "광고",
  ],
  에너지화학: [
    "에너지장비및서비스",
    "석유와가스",
    "가스유틸리티",
    "전기유틸리티",
    "화학",
  ],
  운송: ["항공사", "항공화물운송과물류", "해운사"],
  기계장비: [
    "기계",
    "전기장비",
    "전자장비와기기",
    "우주항공과국방",
    "조선",
    "전기제품",
  ],
  필수소비재: ["식품", "음료", "담배", "화장품"],
  경기소비재: [
    "가정용기기와용품",
    "가구",
    "호텔,레스토랑,레저",
    "백화점과일반상점",
    "섬유,의류,신발,호화품",
    "전자제품",
  ],
  보험: ["생명보험", "손해보험"],
  기타: [
    "교육서비스",
    "종이와목재",
    "포장재",
    "무역회사와판매업체",
    "판매업체",
    "복합기업",
    "핸드셋",
    "상업서비스와공급품",
    "디스플레이장비및부품",
    "디스플레이패널",
    "기타",
  ],
};

function groupJsonData(data) {
  const groupedData = {};

  data.forEach((sector) => {
    const sectorName = sector.name;

    const groupName = Object.keys(categoryGroups).find((group) =>
      categoryGroups[group].includes(sectorName)
    );

    if (groupName) {
      if (!groupedData[groupName]) {
        groupedData[groupName] = {
          name: groupName,
          id: groupName, // id를 name으로 설정
          discretion: null, // 기본값 null
          value: [0, 0, null, null, null, null],
          children: [],
        };
      }

      const subGroup = {
        name: sectorName,
        id: sectorName, // id를 name으로 설정
        discretion: null, // 기본값 null
        value: [0, 0, null, null, null, null],
        children: [],
      };

      sector.children.forEach((child) => {
        const [prevMarketCap, currMarketCap] = child.value;

        subGroup.children.push(child);

        subGroup.value[0] += prevMarketCap;
        subGroup.value[1] += currMarketCap;
      });

      if (subGroup.value[0] > 0) {
        subGroup.value[4] =
          ((subGroup.value[1] - subGroup.value[0]) / subGroup.value[0]) * 100;
      }

      groupedData[groupName].children.push(subGroup);

      groupedData[groupName].value[0] += subGroup.value[0];
      groupedData[groupName].value[1] += subGroup.value[1];
    } else {
      if (!groupedData["기타"]) {
        groupedData["기타"] = {
          name: "기타",
          id: "기타", // 기타 그룹의 id 설정
          discretion: null,
          value: [0, 0, null, null, null, null],
          children: [],
        };
      }

      groupedData["기타"].children.push(sector);
    }
  });

  Object.values(groupedData).forEach((group) => {
    if (group.value[0] > 0) {
      group.value[4] =
        ((group.value[1] - group.value[0]) / group.value[0]) * 100;
    }
  });

  return Object.values(groupedData);
}

// 🔍 검색 버튼 클릭 시 팝업 열기
document
  .getElementById("open-filter-btn")
  .addEventListener("click", function () {
    document.getElementById("filter-popup").style.display = "block";
  });

// ❌ 닫기 버튼 클릭 시 팝업 닫기
document
  .getElementById("close-filter-btn")
  .addEventListener("click", function () {
    document.getElementById("filter-popup").style.display = "none";
  });

// 필터 리셋(초기화) 기능
$("#reset-filter-btn").on("click", function () {
  // 선택사항만 초기화 (시장, 날짜는 그대로 유지)
  $("#depth-select").val("3"); // 기본값으로 3단계
  $("#search-input").val("");
  $("#market-cap-input").val("");
  $("#change-input").val("");
  $("#change-input2").val("");
  $("#market-cap-select").val("gt");
  $("#change-select").val("gt");
  $("#change-select2").val("gt");

  // 초기화 후, 현재 팝업에 남아있는 시장, 날짜, 깊이 등의 조건으로 재검색 실행
  $("#apply-filter-btn").trigger("click");
});

// 필터링된 데이터를 적용하고 차트를 새로 고치는 함수
function applyFiltersAndRefreshChart() {
  const myChart = echarts.getInstanceByDom(
    document.getElementById("chart-container")
  );
  if (!myChart) return;

  // 필터링된 데이터 생성
  const filteredData = filterData(processedData);

  // 차트 옵션 업데이트
  myChart.setOption({
    series: [
      {
        data: filteredData,
        leafDepth: currentFilters.depth,
      },
    ],
  });
}

// 시가총액 입력 필드
document
  .getElementById("market-cap-input")
  .addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9.]/g, "");
  });

// 변동률 입력 필드
document.getElementById("change-input").addEventListener("input", function (e) {
  this.value = this.value.replace(/[^0-9.-]/g, "");
});

function initializeFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("depth-select").value = "3";
  document.getElementById("market-cap-select").value = "gt";
  document.getElementById("market-cap-input").value = "";
  document.getElementById("change-select").value = "gt";
  document.getElementById("change-input").value = "";

  currentFilters = {
    searchQuery: "",
    depth: 3,
    marketCap: { operator: null, value: null },
    changeRate: { operator: null, value: null },
  };
}

// 페이지 로드 시 기본 시장을 KOSPI로 설정하고 날짜 목록 로드 자동 실행
$(document).ready(function () {
  $("#market-select").val("KOSPI").trigger("change");
});

// 시장 선택 시 날짜 목록 불러오기 (기본 날짜 자동 선택 추가)
$("#market-select").on("change", function () {
  var market = $(this).val();
  var jsonFile =
    market === "KOSPI" ? "kospi_json_list.json" : "kosdaq_json_list.json";
  $.getJSON(jsonFile + "?_=" + new Date().getTime(), function (data) {
    var $startDateSelect = $("#start-date-select");
    var $endDateSelect = $("#end-date-select");
    $startDateSelect.empty();
    $endDateSelect.empty();

    // 시작 날짜 드롭다운: 기본 옵션
    $startDateSelect.append(
      '<option value="" disabled selected hidden>시작 날짜 선택</option>'
    );
    // 종료 날짜 드롭다운: 기본 옵션 (빈 값으로 단일 검색)
    $endDateSelect.append(
      '<option value="" selected>단일 검색 (종료 날짜 없음)</option>'
    );

    data.forEach(function (item) {
      var option =
        '<option value="' + item.filename + '">' + item.name + "</option>";
      $startDateSelect.append(option);
      $endDateSelect.append(option);
    });
    $startDateSelect.prop("disabled", false);
    $endDateSelect.prop("disabled", false);

    // 시작 날짜 드롭다운의 첫 번째 실제 날짜 자동 선택 (두 번째 옵션)
    if ($startDateSelect.find("option").length > 1) {
      $startDateSelect.prop("selectedIndex", 1);
    }
  }).fail(function () {
    alert("날짜 목록을 불러오는데 실패했습니다.");
  });
});

// 헬퍼 함수: 단일값 또는 범위(예: "1000~2000") 파싱
function parseFilterInput(value) {
  if (value.indexOf("~") >= 0) {
    var parts = value.split("~");
    var lower = parseFloat(parts[0].trim());
    var upper = parseFloat(parts[1].trim());
    if (!isNaN(lower) && !isNaN(upper)) {
      return { type: "range", lower: lower, upper: upper };
    }
  } else {
    var num = parseFloat(value);
    if (!isNaN(num)) {
      return { type: "single", value: num };
    }
  }
  return null;
}

// 헬퍼 함수: 조건 비교 (op: "gt"(>=), "gte"(>), "eq"(===), "lte"(<), "lt"(<=))
function checkCondition(value, filter, op) {
  if (filter.type === "range") {
    return value >= filter.lower && value <= filter.upper;
  } else if (filter.type === "single") {
    var v = filter.value;
    switch (op) {
      case "gt":
        return value >= v;
      case "gte":
        return value > v;
      case "eq":
        return value === v;
      case "lte":
        return value < v;
      case "lt":
        return value <= v;
      default:
        return true;
    }
  }
  return true;
}

// mergeData: 두 날짜의 데이터를 병합하여 변동률 재계산
function mergeData(oldNodes, newNodes, currentLevel, targetDepth) {
  var merged = [];
  oldNodes.forEach(function (oldNode) {
    var newNode = newNodes.find(function (n) {
      return n.id === oldNode.id;
    });
    if (!newNode) return;
    var mergedNode = Object.assign({}, oldNode);
    if (currentLevel < targetDepth && oldNode.children && newNode.children) {
      mergedNode.children = mergeData(
        oldNode.children,
        newNode.children,
        currentLevel + 1,
        targetDepth
      );
    } else if (currentLevel === targetDepth) {
      if (Array.isArray(oldNode.value) && Array.isArray(newNode.value)) {
        var oldMarketCap = oldNode.value[1];
        var newMarketCap = newNode.value[1];
        var newChange = oldMarketCap
          ? ((newMarketCap - oldMarketCap) / oldMarketCap) * 100
          : 0;
        mergedNode.value = [
          oldNode.value[1], // 이전 값
          newNode.value[1], // 새 값
          oldNode.value[3], // 이전 주가
          newNode.value[3], // 새 주가
          newChange, // 재계산된 변동률
        ];
      }
    }
    merged.push(mergedNode);
  });
  return merged;
}

// 필터링 함수 (조건 적용)
function filterData(
  data,
  currentLevel,
  targetDepth,
  query,
  marketCapFilter,
  marketCapOp,
  changeFilter,
  changeOp,
  changeFilter2,
  changeOp2
) {
  var filtered = [];
  data.forEach(function (item) {
    if (currentLevel < targetDepth && item.children) {
      var filteredChildren = filterData(
        item.children,
        currentLevel + 1,
        targetDepth,
        query,
        marketCapFilter,
        marketCapOp,
        changeFilter,
        changeOp,
        changeFilter2,
        changeOp2
      );
      if (filteredChildren.length > 0) {
        var newItem = Object.assign({}, item);
        newItem.children = filteredChildren;
        filtered.push(newItem);
      }
    } else if (currentLevel === targetDepth) {
      var passesName =
        query === "" || item.name.toLowerCase().indexOf(query) !== -1;
      var passesMarketCap = true;
      if (marketCapFilter && Array.isArray(item.value)) {
        var currentMarketCap = item.value[1];
        passesMarketCap = checkCondition(
          currentMarketCap,
          marketCapFilter,
          marketCapOp
        );
      }
      var passesChange = true;
      if ((changeFilter || changeFilter2) && Array.isArray(item.value)) {
        var currentChange = item.value[4];
        var condition1 = changeFilter
          ? checkCondition(currentChange, changeFilter, changeOp)
          : false;
        var condition2 = changeFilter2
          ? checkCondition(currentChange, changeFilter2, changeOp2)
          : false;
        passesChange = condition1 || condition2;
      }
      if (passesName && passesMarketCap && passesChange) {
        filtered.push(item);
      }
    }
  });
  return filtered;
}

$("#apply-filter-btn").on("click", function () {
  // 필수 필드: 시장 구분, 시작 날짜, 깊이
  var market = $("#market-select").val();
  var startDateFile = $("#start-date-select").val();
  var endDateFile = $("#end-date-select").val();
  var targetDepth = parseInt($("#depth-select").val(), 10);

  if (!market) {
    alert("시장 구분을 선택해주세요.");
    return;
  }
  if (!startDateFile) {
    alert("시작 날짜를 선택해주세요.");
    return;
  }
  if (!targetDepth) {
    alert("깊이를 선택해주세요.");
    return;
  }

  // 선택 사항: 검색어, 시가총액, 변동률 조건
  var query = $("#search-input").val().toLowerCase().trim();
  var marketCapInput = $("#market-cap-input").val().trim();
  var marketCapOp = $("#market-cap-select").val();
  var changeInput = $("#change-input").val().trim();
  var changeOp = $("#change-select").val();
  var changeInput2 = $("#change-input2").val().trim();
  var changeOp2 = $("#change-select2").val();

  var marketCapFilter = marketCapInput
    ? parseFilterInput(marketCapInput)
    : null;
  var changeFilter = changeInput ? parseFilterInput(changeInput) : null;
  var changeFilter2 = changeInput2 ? parseFilterInput(changeInput2) : null;

  var chartDom = document.getElementById("chart-container");
  var myChart = echarts.getInstanceByDom(chartDom);
  if (!myChart) {
    console.error("차트 인스턴스를 찾을 수 없습니다.");
    return;
  }

  // 종료 날짜가 선택되어 있으면 범위 검색, 아니면 단일 날짜 검색
  if (endDateFile) {
    window.isRangeSearch = true;
    $.when(
      $.getJSON("../data/" + startDateFile),
      $.getJSON("../data/" + endDateFile)
    )
      .done(function (oldDataRes, newDataRes) {
        var oldJson = oldDataRes[0];
        var newJson = newDataRes[0];
        var oldGrouped = groupJsonData(oldJson);
        var newGrouped = groupJsonData(newJson);
        var mergedData = mergeData(oldGrouped, newGrouped, 1, targetDepth);
        var filteredData = filterData(
          mergedData,
          1,
          targetDepth,
          query,
          marketCapFilter,
          marketCapOp,
          changeFilter,
          changeOp,
          changeFilter2,
          changeOp2
        );
        var option = myChart.getOption();
        option.series[0].leafDepth = targetDepth;
        option.series[0].data = filteredData;
        myChart.setOption(option);
      })
      .fail(function () {
        alert("선택한 날짜 범위의 데이터를 불러오는데 실패했습니다.");
      });
  } else {
    window.isRangeSearch = false;
    $.getJSON("../data/" + startDateFile, function (newData) {
      var processedData = groupJsonData(newData);
      var filteredData = filterData(
        processedData,
        1,
        targetDepth,
        query,
        marketCapFilter,
        marketCapOp,
        changeFilter,
        changeOp,
        changeFilter2,
        changeOp2
      );
      var option = myChart.getOption();
      option.series[0].leafDepth = targetDepth;
      option.series[0].data = filteredData;
      myChart.setOption(option);
    }).fail(function () {
      alert("선택한 날짜의 데이터를 불러오는데 실패했습니다.");
    });
  }
});

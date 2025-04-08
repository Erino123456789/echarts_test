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

  let hours = parseInt(timePart.slice(0, 2), 10);
  let minutes = parseInt(timePart.slice(2, 4), 10);

  minutes -= subtractMinutes;
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
    if (hours < 0) {
      hours = 23;
      const year = parseInt(datePart.slice(0, 4), 10);
      const month = parseInt(datePart.slice(4, 6), 10);
      const day = parseInt(datePart.slice(6, 8), 10);
      const newDate = new Date(year, month - 1, day - 1);
      datePart = `${newDate.getFullYear()}${String(
        newDate.getMonth() + 1
      ).padStart(2, "0")}${String(newDate.getDate()).padStart(2, "0")}`;
    }
  }

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
  for (let hour = 9; hour <= 15; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const timeString = `${hour.toString().padStart(2, "0")}${minute
        .toString()
        .padStart(2, "0")}`;
      if (hour === 9 && minute < 20) continue;
      if (hour === 15 && minute > 40) break;
      timeSuffixes.push(timeString);
    }
  }
  timeSuffixes.forEach((timeSuffix) => {
    const filename = `${filePrefix}_${date}${timeSuffix}.json`;
    if (cachedFiles[date] && cachedFiles[date][timeSuffix]) {
      console.log(`이미 캐시에 저장된 파일: ${filename}`);
      return;
    }
    $.getJSON(`../data/${filename}`, function (data) {
      if (!cachedFiles[date]) cachedFiles[date] = {};
      cachedFiles[date][timeSuffix] = data;
    }).fail(function () {
      console.warn(`Failed to load: ${filename}`);
    });
  });
}

function loadDataFromCache(filePrefix, date, timeSuffix) {
  if (timeSuffix > "1540") {
    console.warn(
      `15:50 이후 데이터 요청 제한: ${filePrefix}_${date}${timeSuffix}.json`
    );
    return;
  }
  const data = cachedFiles[date] && cachedFiles[date][timeSuffix];
}

function calculateSliderIndex(timeString) {
  const hours = parseInt(timeString.slice(0, 2));
  const minutes = parseInt(timeString.slice(2, 4));
  const baseHours = 9;
  const baseMinutes = 20;
  const totalMinutes = hours * 60 + minutes - (baseHours * 60 + baseMinutes);
  return Math.floor(totalMinutes / 10);
}

function getNearestPreviousTime() {
  const currentTime = new Date();
  const utcOffset = 9 * 60;
  const localTimeInMinutes =
    currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes() + utcOffset;
  let hours = Math.floor(localTimeInMinutes / 60) % 24;
  let minutes = localTimeInMinutes % 60;
  minutes = Math.floor(minutes / 10) * 10;
  if (
    hours < 9 ||
    (hours === 9 && minutes < 20) ||
    (hours === 15 && minutes > 50)
  ) {
    return null; // 범위 밖이면 null 반환
  }
  console.log(
    `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`
  );
  return `${hours.toString().padStart(2, "0")}${minutes
    .toString()
    .padStart(2, "0")}`;
}

function updateTimeDisplay(sliderValue) {
  let timeString;
  if (sliderValue === 0) {
    timeString = "09:20";
  } else if (sliderValue >= 39) {
    timeString = "15:50";
  } else {
    const time = new Date();
    time.setHours(9, 20);
    time.setMinutes(time.getMinutes() + sliderValue * 10);
    timeString = time.toTimeString().slice(0, 5);
  }
  console.log(`슬라이더 값: ${sliderValue}, 시간: ${timeString}`);
}

function handleScreenshot() {
  const screenshotSelect = document.getElementById("screenshot-select");
  const selectedOption = screenshotSelect.value;
  if (selectedOption === "current") {
    captureCurrentScreenshot()
      .then((imgData) => {
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "echarts_screenshot.png";
        link.click();
        screenshotSelect.options[0].text = "스크린샷";
        screenshotSelect.value = "";
      })
      .catch(console.error);
  } else if (selectedOption === "overall") {
    captureOverallFlowScreenshots()
      .then((gifData) => {
        const link = document.createElement("a");
        link.href = gifData;
        link.download = "flow.gif";
        link.click();
        screenshotSelect.options[0].text = "스크린샷";
        screenshotSelect.value = "";
      })
      .catch((error) => {
        console.error("전체 흐름 스크린샷 생성 실패:", error);
      });
  }
}

function captureCurrentScreenshot() {
  const chartContainer = document.getElementById("chart-container");
  return new Promise((resolve, reject) => {
    if (chartContainer) {
      html2canvas(chartContainer, { backgroundColor: null })
        .then(function (canvas) {
          const imgData = canvas.toDataURL("image/png");
          resolve(imgData);
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
    if (capturing) return;
    capturing = true;
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
      document.getElementById("time-slider").value = currentIndex;
      document.getElementById("time-slider").dispatchEvent(new Event("input"));
      setTimeout(function () {
        captureCurrentScreenshot()
          .then((imageData) => {
            const img = new Image();
            img.src = imageData;
            img.onload = function () {
              const delayTime = currentIndex === totalSlides - 1 ? 5000 : 500;
              gif.addFrame(img, { delay: delayTime, copy: true });
              currentIndex++;
              if (currentIndex < totalSlides) {
                captureAndAddFrame();
              } else {
                gif.on("finished", function (blob) {
                  const gifUrl = URL.createObjectURL(blob);
                  resolve(gifUrl);
                  capturing = false;
                });
                gif.render();
              }
            };
          })
          .catch((error) => {
            reject("스크린샷 캡쳐 실패: " + error);
            capturing = false;
          });
      }, 400);
    }
    setTimeout(captureAndAddFrame, 200);
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function loadJsonList(type) {
  return new Promise((resolve, reject) => {
    const lowerType = type.toLowerCase();
    const fileName =
      lowerType === "kospi" ? "kospi_json_list.json" : "kosdaq_json_list.json";
    const urlWithTimestamp = fileName + "?_=" + new Date().getTime();
    $.getJSON(urlWithTimestamp, function (data) {
      const buttonContainer = $("#json-button-container");
      buttonContainer.empty();
      data.forEach((item) => {
        const button = $("<button></button>")
          .text(item.name)
          .click(() => {
            currentFilename = item.filename;
            const selectedDate = currentFilename.slice(-13, -5);
            const filePrefix = currentFilename.split("_")[0] + "_map_data";
            loadAndCacheData(filePrefix, selectedDate);
            document.getElementById("slider-container").style.display = "block";
            loadDataFromCache(filePrefix, selectedDate, "0920");
            document.getElementById("slider-container").style.display = "block";
            loadData(type, currentFilename, true, () => {
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
  const hours = currentTime.getUTCHours() + 9;
  const minutes = currentTime.getUTCMinutes();
  $.get("../data/" + filename, function (kospi_data) {
    allData = kospi_data;
    processedData = groupJsonData(kospi_data);
    console.log(processedData);
    if (initialLoad) {
      myChart.hideLoading();
      initialLoad = false;
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
              if (info.data.children) {
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
          type: "continuous",
          min: -5,
          max: 5,
          dimension: 4,
          inRange: {
            color: ["#942e38", "#aaaaaa", "#269f3c"],
          },
          show: true,
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
              borderWidth: 1,
              fontWeight: "bold",
              formatter: function (info) {
                let name = info.name;
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
                return `${params.name}\n${changeleaf}`;
              },
              color: "#fff",
              textShadowColor: "black",
              textShadowBlur: 4,
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
      fallbackCallback();
    } else {
      console.error(`Failed to load: ${filename}`);
      const nearestTime = getNearestPreviousTime();
      const sliderIndex = nearestTime ? calculateSliderIndex(nearestTime) : 39;
      $("#time-slider").val(sliderIndex);
      updateTimeDisplay(sliderIndex);
      const newFilename = getFilenameForSliderIndex(sliderIndex);
      loadData(type, newFilename, false, () => {
        let newSliderIndex = Math.max(sliderIndex - 1, 0);
        $("#time-slider").val(newSliderIndex);
        updateTimeDisplay(newSliderIndex);
        const fallbackFilename = getFilenameForSliderIndex(newSliderIndex);
        loadData(type, fallbackFilename, false);
      });
    }
  });
  if (option && typeof option === "object") {
    myChart.setOption(option);
  }
}

function getFilenameForSliderIndex(sliderIndex) {
  const baseFilename = currentFilename.substring(
    0,
    currentFilename.length - 10
  );
  const baseDate = currentFilename.slice(-10, -5);
  if (sliderIndex >= 39) {
    return currentFilename;
  }
  const totalMinutes = 20 + sliderIndex * 10;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hourString = (9 + hour).toString().padStart(2, "0");
  const minuteString = minute.toString().padStart(2, "0");
  const timeString = `${baseDate}${hourString}${minuteString}`;
  return `${baseFilename}${timeString}.json`;
}

document.getElementById("time-slider").addEventListener("input", function () {
  const sliderValue = parseInt(this.value);
  updateTimeDisplay(sliderValue);
  const newFilename = getFilenameForSliderIndex(sliderValue);
  // 직접 DOM에서 현재 선택된 시장 값을 읽어 사용
  const currentMarket = $("#market-select").val();
  console.log("현재 시장:", currentMarket, "새 파일명:", newFilename);
  loadData(currentMarket, newFilename, false);
});

window.onload = function () {
  initializeFilters();
  loadJsonList("kospi")
    .then((data) => {
      if (data && data.length > 0) {
        const firstItem = data[0];
        currentFilename = firstItem.filename;
        const selectedDate = currentFilename.slice(-13, -5);
        const filePrefix = currentFilename.split("_")[0] + "_map_data";
        loadAndCacheData(filePrefix, selectedDate);
        document.getElementById("slider-container").style.display = "block";
        loadData("KOSPI", currentFilename, true, () => {
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
          id: groupName,
          discretion: null,
          value: [0, 0, null, null, null, null],
          children: [],
        };
      }
      const subGroup = {
        name: sectorName,
        id: sectorName,
        discretion: null,
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
          id: "기타",
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

document
  .getElementById("open-filter-btn")
  .addEventListener("click", function () {
    document.getElementById("filter-popup").style.display = "block";
  });

document
  .getElementById("close-filter-btn")
  .addEventListener("click", function () {
    document.getElementById("filter-popup").style.display = "none";
  });

$("#reset-filter-btn").on("click", function () {
  $("#depth-select").val("3");
  $("#search-input").val("");
  $("#market-cap-input").val("");
  $("#change-input").val("");
  $("#change-input2").val("");
  $("#market-cap-select").val("gt");
  $("#change-select").val("gt");
  $("#change-select2").val("gt");
  $("#apply-filter-btn").trigger("click");
});

function applyFiltersAndRefreshChart() {
  const myChart = echarts.getInstanceByDom(
    document.getElementById("chart-container")
  );
  if (!myChart) return;
  const filteredData = filterData(processedData);
  myChart.setOption({
    series: [
      {
        data: filteredData,
        leafDepth: currentFilters.depth,
      },
    ],
  });
}

document
  .getElementById("market-cap-input")
  .addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9.]/g, "");
  });

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

$(document).ready(function () {
  $("#market-select").val("KOSPI").trigger("change");
});

$("#market-select").on("change", function () {
  var market = $(this).val();
  var jsonFile =
    market === "KOSPI" ? "kospi_json_list.json" : "kosdaq_json_list.json";
  $.getJSON(jsonFile + "?_=" + new Date().getTime(), function (data) {
    var $startDateSelect = $("#start-date-select");
    var $endDateSelect = $("#end-date-select");
    $startDateSelect.empty();
    $endDateSelect.empty();
    $startDateSelect.append(
      '<option value="" disabled selected hidden>시작 날짜 선택</option>'
    );
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
    // 여기서 첫 번째 선택 항목으로 currentFilename을 업데이트
    if ($startDateSelect.find("option").length > 1) {
      $startDateSelect.prop("selectedIndex", 1);
      currentFilename = $startDateSelect.val();
    }
  }).fail(function () {
    alert("날짜 목록을 불러오는데 실패했습니다.");
  });
});

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
          oldNode.value[1],
          newNode.value[1],
          oldNode.value[3],
          newNode.value[3],
          newChange,
        ];
      }
    }
    merged.push(mergedNode);
  });
  return merged;
}

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
          : null;
        var condition2 = changeFilter2
          ? checkCondition(currentChange, changeFilter2, changeOp2)
          : null;
        if (changeFilter && changeFilter2) {
          if (
            (changeFilter.value >= 0 && changeFilter2.value >= 0) ||
            (changeFilter.value < 0 && changeFilter2.value < 0)
          ) {
            var lowerBound = Math.min(changeFilter.value, changeFilter2.value);
            var upperBound = Math.max(changeFilter.value, changeFilter2.value);
            passesChange =
              currentChange >= lowerBound && currentChange <= upperBound;
          } else {
            passesChange = condition1 || condition2;
          }
        } else if (changeFilter) {
          passesChange = condition1;
        } else if (changeFilter2) {
          passesChange = condition2;
        }
      }
      if (passesName && passesMarketCap && passesChange) {
        filtered.push(item);
      }
    }
  });
  return filtered;
}

$("#apply-filter-btn").on("click", function () {
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
        // 제목 업데이트 추가
        var formattedTitleDate = adjustTimeByMinutes(startDateFile, 20);
        var marketType = $("#market-select").val();
        option.title = {
          text: `${marketType.toUpperCase()} - ${formattedTitleDate}`,
          left: "center",
        };
        myChart.setOption(option);
      })
      .fail(function () {
        alert("선택한 날짜 범위의 데이터를 불러오는데 실패했습니다.");
      });
  } else {
    window.isRangeSearch = false;
    // 단일 검색(종료 날짜 없음)인 경우
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
      // 여기에 제목 업데이트 추가
      var formattedTitleDate = adjustTimeByMinutes(startDateFile, 20);
      var marketType = $("#market-select").val(); // KOSPI 또는 KOSDAQ
      option.title = {
        text: `${marketType.toUpperCase()} - ${formattedTitleDate}`,
        left: "center",
      };
      myChart.setOption(option);
    }).fail(function () {
      const dateMatch = startDateFile.match(/(\d{8})(\d{4})?\.json$/);
      if (dateMatch && !dateMatch[2]) {
        const selectedDate = dateMatch[1];
        const filePrefix = startDateFile.split("_")[0] + "_map_data";
        const nearestTime = getNearestPreviousTime();
        if (nearestTime) {
          const fileWithTime = `${filePrefix}_${selectedDate}${nearestTime}.json`;
          console.log(
            "404 발생, 시간값 추가된 파일명으로 재시도:",
            fileWithTime
          );
          $.getJSON("../data/" + fileWithTime, function (newData2) {
            // 재시도 성공 시 처리...
          }).fail(function () {
            alert("선택한 날짜의 데이터를 불러오는데 실패했습니다.");
          });
        } else {
          alert("선택한 날짜의 데이터를 불러오는데 실패했습니다.");
        }
      } else {
        alert("선택한 날짜의 데이터를 불러오는데 실패했습니다.");
      }
    });
  }
});

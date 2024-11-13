let selectedMode = ""; // 연도, 분기, 월별 모드
let isPercentage = false; // 기본적으로 '값' 모드

// 각 모드 클릭 시 처리
document.getElementById("yearButton").addEventListener("click", function () {
  selectedMode = "year"; // 연도별 모드로 설정
  updateChart();
});

document.getElementById("quarterButton").addEventListener("click", function () {
  selectedMode = "quarter"; // 분기별 모드로 설정
  updateChart();
});

document.getElementById("monthButton").addEventListener("click", function () {
  selectedMode = "month"; // 월별 모드로 설정
  updateChart();
});

// 비율로 보기 라디오 버튼 클릭 시 처리
document.querySelectorAll('input[name="viewMode"]').forEach((radio) => {
  radio.addEventListener("change", function () {
    isPercentage = this.value === "percentage"; // 비율 모드 설정
    updateChart(); // 차트 업데이트
  });
});

// 숫자 형식 포맷 (백만원 단위로)
function formatNumber(value) {
  const valueInMillion = value / 1000; // 1000으로 나누어 백만원 단위로 변환
  return valueInMillion.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ","); // 쉼표 구분자 추가
}

// 차트 초기화
var chart = echarts.init(document.getElementById("main"));
var option = {
  title: { text: "주식 시장 데이터" },
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      const value = params.value;
      // 비율로 보기일 경우
      if (isPercentage) {
        const percentageValue = (value * 100).toFixed(1);
        return `${params.name}\n${params.seriesName}\n${percentageValue}%`;
      }
      // 값으로 보기일 경우
      return `${params.name}\n${params.seriesName}\n${formatNumber(
        value
      )} 백만원`;
    },
  },
  legend: {
    data: [], // 범례
    orient: "vertical", // 범례를 세로로 배치
    top: "5%", // 범례를 차트 위쪽에 배치
    left: "left", // 범례를 차트의 왼쪽에 배치
    itemGap: 1, // 범례 항목 간의 간격을 조정
  },
  xAxis: {
    type: "value", // 시가총액 등의 값을 나타내는 가로 축
    name: "시가총액", // x축 이름 설정 (필요에 따라)
  },
  yAxis: {
    type: "category", // 연도를 세로로 표시하는 카테고리형 축
    data: [], // 연도 데이터를 여기에 설정
    name: "연도", // y축 이름 설정 (필요에 따라)
  },
  series: [], // 누적 데이터를 담을 시리즈
  emphasis: {
    focus: "series",
  },
};

// 차트 리사이즈 시 자동으로 크기 조정
window.addEventListener("resize", function () {
  chart.resize();
});

// 날짜 입력 형식에 따른 필드 표시 설정 함수
function setDateRange(range) {
  // 모든 입력 필드 숨기기
  document.getElementById("startYearInput").style.display = "none";
  document.getElementById("endYearInput").style.display = "none";
  document.getElementById("startYearQuarterInput").style.display = "none";
  document.getElementById("endYearQuarterInput").style.display = "none";
  document.getElementById("startQuarterInput").style.display = "none";
  document.getElementById("endQuarterInput").style.display = "none";
  document.getElementById("startMonthInput").style.display = "none";
  document.getElementById("endMonthInput").style.display = "none";

  if (range === "year") {
    // 연도별 모드에서 연도 입력 필드만 표시
    document.getElementById("startYearInput").style.display = "inline-block";
    document.getElementById("endYearInput").style.display = "inline-block";
    setDefaultYears();
  } else if (range === "quarter") {
    // 분기별 모드에서 분기 및 연도 입력 필드 표시
    document.getElementById("startYearQuarterInput").style.display =
      "inline-block";
    document.getElementById("endYearQuarterInput").style.display =
      "inline-block";
    document.getElementById("startQuarterInput").style.display = "inline-block";
    document.getElementById("endQuarterInput").style.display = "inline-block";
    setDefaultQuarters();
  } else if (range === "month") {
    // 월별 모드에서 월 입력 필드 표시
    document.getElementById("startMonthInput").style.display = "inline-block";
    document.getElementById("endMonthInput").style.display = "inline-block";
    setDefaultMonths();
  }
}

// 연도별 기본값 설정 (올해부터 과거 4년)
function setDefaultYears() {
  const currentYear = new Date().getFullYear();
  if (!document.getElementById("startYearInput").value) {
    document.getElementById("startYearInput").value = currentYear - 3;
  }
  if (!document.getElementById("endYearInput").value) {
    document.getElementById("endYearInput").value = currentYear;
  }
}

// 월별 기본값 설정 (이번 달부터 지난 12개월)
function setDefaultMonths() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 현재 월
  const currentYear = currentDate.getFullYear(); // 현재 연도

  if (!document.getElementById("startMonthInput").value) {
    // 시작 월은 12개월 전으로 설정
    const startMonth = new Date(currentYear, currentMonth - 12, 1);
    document.getElementById(
      "startMonthInput"
    ).value = `${startMonth.getFullYear()}${(startMonth.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  }

  if (!document.getElementById("endMonthInput").value) {
    // 끝 월은 현재 월로 설정
    document.getElementById(
      "endMonthInput"
    ).value = `${currentYear}${currentMonth.toString().padStart(2, "0")}`;
  }
}

// 분기별 기본값 설정 (현재 연도의 1분기부터 4분기까지)
function setDefaultQuarters() {
  const currentYear = new Date().getFullYear(); // 현재 연도
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3); // 현재 분기 (1~4)

  if (!document.getElementById("startYearQuarterInput").value) {
    document.getElementById("startYearQuarterInput").value = currentYear;
  }

  if (!document.getElementById("endYearQuarterInput").value) {
    document.getElementById("endYearQuarterInput").value = currentYear;
  }

  if (!document.getElementById("startQuarterInput").value) {
    // 시작 분기는 기본적으로 1분기로 설정
    document.getElementById("startQuarterInput").value = "1";
  }

  if (!document.getElementById("endQuarterInput").value) {
    // 끝 분기는 기본적으로 4분기로 설정
    document.getElementById("endQuarterInput").value = "4";
  }
}

// 차트 데이터 업데이트 (연도별, 분기별, 월별 처리)
async function updateChart() {
  // ECharts 로딩 인디케이터 표시
  chart.showLoading({
    text: "로딩 중...", // 표시할 텍스트 (선택 사항)
    effect: "spin", // 로딩 애니메이션 스타일 (기본값: 'spin')
    textStyle: {
      fontSize: 16,
      color: "#000",
    },
  });

  let yAxisData = [];
  let seriesData = [];
  let legendData = [];

  if (selectedMode === "year") {
    const startYear = document.getElementById("startYearInput").value;
    const endYear = document.getElementById("endYearInput").value;
    // 연도별 데이터 처리
    for (let year = parseInt(startYear); year <= parseInt(endYear); year++) {
      yAxisData.push(year.toString());
      const yearData = await fetchDataForYear(year);
      const yearlyData = processYearlyData(yearData);

      // 각 카테고리별로 항목 처리
      for (let category in categoryGroups) {
        let categoryTotal = 0;

        // 카테고리 내 항목의 데이터를 누적
        categoryGroups[category].forEach((item) => {
          if (yearlyData[item]) {
            categoryTotal += yearlyData[item]; // 항목들의 값을 누적
          }
        });

        // 카테고리가 이미 범례에 없다면 추가
        if (!legendData.includes(category)) {
          legendData.push(category);
        }

        // 카테고리별로 누적된 값을 저장
        if (!seriesData[category]) {
          seriesData[category] = [];
        }
        seriesData[category].push(categoryTotal);
      }
    }
  } else if (selectedMode === "quarter") {
    const startYear = document.getElementById("startYearQuarterInput").value;
    const startQuarter = document.getElementById("startQuarterInput").value;
    const endYear = document.getElementById("endYearQuarterInput").value;
    const endQuarter = document.getElementById("endQuarterInput").value;
    // 분기별 데이터 처리
    for (let year = parseInt(startYear); year <= parseInt(endYear); year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterData = await fetchDataForQuarter(year, quarter);
        const quarterlyData = processQuarterlyData(quarterData);

        yAxisData.push(`${year} Q${quarter}`);

        // 카테고리별로 항목 처리
        for (let category in categoryGroups) {
          let categoryTotal = 0;

          // 카테고리 내 항목의 데이터를 누적
          categoryGroups[category].forEach((item) => {
            if (quarterlyData[item]) {
              categoryTotal += quarterlyData[item]; // 항목들의 값을 누적
            }
          });

          // 카테고리가 이미 범례에 없다면 추가
          if (!legendData.includes(category)) {
            legendData.push(category);
          }

          // 카테고리별로 누적된 값을 저장
          if (!seriesData[category]) {
            seriesData[category] = [];
          }
          seriesData[category].push(categoryTotal);
        }
      }
    }
  } else if (selectedMode === "month") {
    const startMonth = document.getElementById("startMonthInput").value;
    const endMonth = document.getElementById("endMonthInput").value;

    const startYear = parseInt(startMonth.slice(0, 4));
    const startMonthNum = parseInt(startMonth.slice(4, 6));
    const endYear = parseInt(endMonth.slice(0, 4));
    const endMonthNum = parseInt(endMonth.slice(4, 6));

    for (let year = startYear; year <= endYear; year++) {
      let startMonthLoop = year === startYear ? startMonthNum : 1;
      let endMonthLoop = year === endYear ? endMonthNum : 12;

      for (let month = startMonthLoop; month <= endMonthLoop; month++) {
        const monthString = `${year}${month.toString().padStart(2, "0")}`;
        yAxisData.push(monthString);

        const monthData = await fetchDataForMonth(year, month);
        const monthlyData = processYearlyData(monthData);

        for (let category in categoryGroups) {
          let categoryTotal = 0;
          categoryGroups[category].forEach((item) => {
            if (monthlyData[item]) {
              categoryTotal += monthlyData[item];
            }
          });

          if (!legendData.includes(category)) {
            legendData.push(category);
          }

          if (!seriesData[category]) {
            seriesData[category] = [];
          }
          seriesData[category].push(categoryTotal);
        }
      }
    }
  }

  // ECharts 업데이트
  option.yAxis.data = yAxisData.reverse(); // 세로 축 데이터(날짜)
  option.legend.data = legendData;

  if (isPercentage) {
    // 비율 계산
    const totalSum = Object.values(seriesData).reduce((acc, curr) => {
      return acc.map((v, i) => v + curr[i]);
    }, new Array(Object.values(seriesData)[0].length).fill(0)); // 각 시리즈의 값이 모두 동일한 길이를 가지도록 설정

    // 비율로 계산
    option.series = Object.keys(seriesData).map((category) => ({
      name: category,
      type: "bar",
      stack: "total",
      data: seriesData[category]
        .map((value, index) => {
          const percentageValue = (value / totalSum[index]) * 100;

          // 콘솔 로그로 값 확인
          console.log(
            `Category: ${category}, Value: ${value}, TotalSum: ${totalSum[index]}, Percentage: ${percentageValue}%`
          );

          // 비율이 100%를 초과하지 않도록 처리
          return Math.min(percentageValue, 100); // 최대값을 100으로 제한
        })
        .reverse(),
    }));
    // 비율 모드일 때 xAxis 최대값을 100으로 설정
    option.xAxis.max = 100;
  } else {
    // 값으로 보기
    option.series = Object.keys(seriesData).map((category) => ({
      name: category,
      type: "bar", // 'bar'로 변경하여 누적 막대 그래프
      stack: "total", // 누적 표시
      data: seriesData[category].reverse(),
    }));

    // 값 모드일 때는 xAxis의 최대값을 설정하지 않음
    option.xAxis.max = null; // 기본값 그대로
  }

  // 툴팁 설정
  option.tooltip = {
    trigger: "item", // 'item'으로 설정하여 마우스를 올린 항목에 대해서만 툴팁 표시
    axisPointer: {
      type: "shadow", // 막대 그래프에서 그림자 스타일로 포인터 표시
    },
    formatter: function (params) {
      let tooltipContent = "";

      let value = params.value;
      if (isPercentage) {
        // 비율 모드일 때는 툴팁에 퍼센트를 표시
        value = value.toFixed(2) + "%"; // 소수점 두 자릿수로 표시
        tooltipContent += `<strong>${params.seriesName}:</strong> ${value}<br/>`;
        return tooltipContent;
      }
      return `<strong>${params.seriesName}:</strong> ${formatNumber(
        value
      )} 백만원`;
    },
  };

  chart.setOption(option);
  // ECharts 로딩 인디케이터 숨기기
  chart.hideLoading();
}

// 분기별 데이터 가져오기 (분기별로 데이터를 요청)
async function fetchDataForQuarter(year, quarter) {
  const market = document.getElementById("marketSelect").value;
  let date = new Date(year, (quarter - 1) * 3, 1); // 분기별 첫날 설정
  let data = null;

  if (market === "all") {
    let kospiData = await getMarketData("kospi", date);
    let kosdaqData = await getMarketData("kosdaq", date);

    data = mergeData(kospiData, kosdaqData);
  } else {
    data = await getMarketData(market, date);
  }

  return data;
}

// 월별 데이터 가져오기 (월별로 데이터를 요청)
async function fetchDataForMonth(year, month) {
  const market = document.getElementById("marketSelect").value;
  let date = new Date(year, month - 1, 1); // 월별 첫날로 설정
  let data = null;

  if (market === "all") {
    let kospiData = await getMarketData("kospi", date);
    let kosdaqData = await getMarketData("kosdaq", date);

    data = mergeData(kospiData, kosdaqData);
  } else {
    data = await getMarketData(market, date);
  }

  return data;
}

// 분기별 데이터 처리 함수
function processQuarterlyData(data) {
  let quarterlyData = {};

  data.forEach((entry) => {
    const category = entry.id; // 예: "자동차"나 "반도체"
    const value = entry.value; // 예: 2910637.0 값

    // 카테고리별로 데이터를 저장
    if (!quarterlyData[category]) {
      quarterlyData[category] = 0;
    }

    quarterlyData[category] += value; // 값을 누적
  });

  return quarterlyData;
}

// 월별 데이터 처리 함수
function processMonthlyData(data) {
  let monthlyData = {};

  data.forEach((entry) => {
    const category = entry.id; // 예: "자동차"나 "반도체"
    const value = entry.value; // 예: 2910637.0 값

    // 카테고리별로 데이터를 저장
    if (!monthlyData[category]) {
      monthlyData[category] = 0;
    }

    monthlyData[category] += value; // 값을 누적
  });

  return monthlyData;
}

// 데이터 처리 함수 (연도별)
function processYearlyData(data) {
  let yearlyData = {};

  data.forEach((entry) => {
    const category = entry.id; // 예: "자동차"나 "반도체"
    const value = entry.value; // 예: 2910637.0 값

    // 카테고리별로 데이터를 저장
    if (!yearlyData[category]) {
      yearlyData[category] = 0;
    }

    yearlyData[category] += value; // 값을 누적
  });

  return yearlyData;
}

// 연도별 데이터 가져오기
async function fetchDataForYear(year) {
  const market = document.getElementById("marketSelect").value;
  let date = new Date(year, 0, 2); // 기본적으로 1월 2일
  let data = null;

  if (market === "all") {
    let kospiData = await getMarketData("kospi", date);
    let kosdaqData = await getMarketData("kosdaq", date);

    data = mergeData(kospiData, kosdaqData);
  } else {
    data = await getMarketData(market, date);
  }

  return data;
}

// 특정 시장에 대한 데이터를 가져오는 함수
async function getMarketData(market, date) {
  let data = null;
  while (!data) {
    const jsonUrl = `https://erino123456789.github.io/echarts_test/data/${market}_map_data_${date.getFullYear()}${String(
      date.getMonth() + 1
    ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}.json`;
    const response = await fetch(jsonUrl);
    if (response.ok) {
      data = await response.json();
    } else {
      date.setDate(date.getDate() + 1);
    }
  }
  return data;
}

// KOSPI와 KOSDAQ 데이터를 합치는 함수
function mergeData(kospiData, kosdaqData) {
  return [...kospiData, ...kosdaqData]; // 두 데이터를 단순히 합침
}

// 그룹화된 카테고리 정의
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
    "디스플레이장비및부품",
    "디스플레이패널",
    "전자장비와기기",
    "전자제품",
    "통신장비",
    "인터넷과카탈로그소매",
    "무선통신서비스",
    "다각화된통신서비스",
    "핸드셋",
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
    "상업서비스와공급품",
    "전기장비",
    "우주항공과국방",
    "조선",
  ],
  필수소비재: ["식품", "음료", "담배"],
  경기소비재: [
    "가정용기기와용품",
    "가구",
    "호텔,레스토랑,레저",
    "백화점과일반상점",
    "섬유,의류,신발,호화품",
    "화장품",
  ],
  보험: ["생명보험", "손해보험"],
  기타: [
    "교육서비스",
    "전기제품",
    "종이와목재",
    "포장재",
    "무역회사와판매업체",
    "복합기업",
  ],
};

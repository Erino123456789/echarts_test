// ECharts 인스턴스 생성
var chart = echarts.init(document.getElementById("main"));
var useGradient = true;
var currentChartData = null;

// 전역 변수
var companiesData = [];
var currentAvailableOptions = []; // [{year, quarter, type}, ...]
var selectedYear = null;
var selectedQuarter = null;
var selectedType = null;

// (1) CSV 로드 (ticker 폴더 내 CSV 파일)
function loadCompanyData() {
  Papa.parse("ticker/krx_dart_merged.csv", {
    download: true,
    header: true,
    complete: function (results) {
      companiesData = results.data;
      console.log("Loaded companies:", companiesData);
    },
    error: function (err) {
      console.error("CSV 로드 오류:", err);
    },
  });
}

// (2) 자동완성: 검색어 필터링
function filterCompanies(query) {
  if (!query) return [];
  query = query.toLowerCase();
  return companiesData.filter((c) => {
    return (
      (c.stock_name && c.stock_name.toLowerCase().includes(query)) ||
      (c.stock_code && c.stock_code.toLowerCase().includes(query))
    );
  });
}

function showSuggestions() {
  const input = document.getElementById("companyInput");
  const suggestionContainer = document.getElementById("companySuggestions");
  const query = input.value.trim();
  const matches = filterCompanies(query);
  suggestionContainer.innerHTML = "";
  if (matches.length === 0) {
    suggestionContainer.style.display = "none";
    return;
  }
  matches.forEach((match) => {
    const div = document.createElement("div");
    div.textContent = match.stock_name + " (" + match.stock_code + ")";
    div.addEventListener("click", () => {
      selectCompany(match);
    });
    suggestionContainer.appendChild(div);
  });
  suggestionContainer.style.display = "block";
}

function selectCompany(company) {
  const input = document.getElementById("companyInput");
  input.value = company.stock_name + " (" + company.stock_code + ")";
  document.getElementById("companySuggestions").style.display = "none";
  // 종목 선택 시 기본값으로 최신 연도와 연결재무재표(CFS)를 우선 선택하도록 옵션 체크
  checkAvailableOptions(company.stock_code, true);
}

document
  .getElementById("companyInput")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const matches = filterCompanies(this.value.trim());
      if (matches.length === 1) {
        selectCompany(matches[0]);
      }
    }
  });
document
  .getElementById("companyInput")
  .addEventListener("input", showSuggestions);

// (3) 파일 존재 여부 체크 및 옵션 버튼 활성화
// autoDefault가 true이면 최신 연도와 CFS를 우선 자동 선택
function checkAvailableOptions(stockCode, autoDefault = false) {
  disableAllButtons();
  const years = [2021, 2022, 2023, 2024];
  const quarters = ["11013", "11012", "11014", "11011"];
  const types = ["OFS", "CFS"];
  currentAvailableOptions = [];
  let promises = [];

  years.forEach((year) => {
    quarters.forEach((quarter) => {
      types.forEach((type) => {
        const fileName = `data/${stockCode}_${year}_${quarter}_${type}.json`;
        const p = fetch(fileName, { method: "HEAD" })
          .then((response) => {
            if (response.ok) {
              currentAvailableOptions.push({ year, quarter, type });
            }
          })
          .catch((err) => {});
        promises.push(p);
      });
    });
  });

  Promise.all(promises).then(() => {
    enableButtonsFromAvailable(currentAvailableOptions, autoDefault);
  });
}

function disableAllButtons() {
  document.querySelectorAll(".year-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("active");
  });
  selectedYear = null;
  document.querySelectorAll(".quarter-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("active");
  });
  selectedQuarter = null;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("active");
  });
  selectedType = null;
}

// 연도 버튼 활성화 및 autoDefault 처리
function enableButtonsFromAvailable(available, autoDefault) {
  const uniqueYears = [...new Set(available.map((a) => a.year))];
  document.querySelectorAll(".year-btn").forEach((btn) => {
    const yearVal = parseInt(btn.dataset.year, 10);
    if (uniqueYears.includes(yearVal)) {
      btn.disabled = false;
    }
  });
  if (autoDefault && uniqueYears.length > 0) {
    let defaultYear = Math.max(...uniqueYears);
    // 자동으로 해당 연도 버튼 클릭
    document.querySelectorAll(".year-btn").forEach((btn) => {
      if (parseInt(btn.dataset.year, 10) === defaultYear) {
        btn.click();
      }
    });
  }
}

// (4) 연도, 분기, 타입 버튼 클릭 이벤트 및 자동 기본값 선택
document.querySelectorAll(".year-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    if (this.disabled) return;
    document
      .querySelectorAll(".year-btn")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    selectedYear = parseInt(this.dataset.year, 10);

    selectedQuarter = null;
    selectedType = null;
    document.querySelectorAll(".quarter-btn").forEach((b) => {
      b.classList.remove("active");
      b.disabled = true;
    });
    document.querySelectorAll(".type-btn").forEach((b) => {
      b.classList.remove("active");
      b.disabled = true;
    });

    const availableQuarters = currentAvailableOptions
      .filter((o) => o.year === selectedYear)
      .map((o) => o.quarter);
    document.querySelectorAll(".quarter-btn").forEach((b) => {
      if (availableQuarters.includes(b.dataset.quarter)) {
        b.disabled = false;
      }
    });

    // 자동 기본값: 분기는 Full Year("11011") 우선, 없으면 가장 높은 분기
    autoSelectQuarterAndType();
  });
});

function autoSelectQuarterAndType() {
  const optionsForYear = currentAvailableOptions.filter(
    (o) => o.year === selectedYear
  );
  let defaultQuarter = null;
  // 우선 Full Year("11011") 선택
  if (optionsForYear.some((o) => o.quarter === "11011")) {
    defaultQuarter = "11011";
  } else {
    // Full Year가 없다면, 사전 정의된 순서에 따라 선택 (예: Q3 > Q2 > Q1)
    const quarterOrder = { 11014: 3, 11012: 2, 11013: 1 };
    const available = optionsForYear
      .map((o) => o.quarter)
      .filter((q) => quarterOrder[q]);
    if (available.length > 0) {
      available.sort((a, b) => quarterOrder[b] - quarterOrder[a]);
      defaultQuarter = available[0];
    }
  }
  if (defaultQuarter) {
    document.querySelectorAll(".quarter-btn").forEach((b) => {
      if (b.dataset.quarter === defaultQuarter) {
        b.click();
      }
    });
  }
}

document.querySelectorAll(".quarter-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    if (this.disabled) return;
    document
      .querySelectorAll(".quarter-btn")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    selectedQuarter = this.dataset.quarter;

    selectedType = null;
    document.querySelectorAll(".type-btn").forEach((b) => {
      b.classList.remove("active");
      b.disabled = true;
    });
    const availableTypes = currentAvailableOptions
      .filter((o) => o.year === selectedYear && o.quarter === selectedQuarter)
      .map((o) => o.type);
    document.querySelectorAll(".type-btn").forEach((b) => {
      if (availableTypes.includes(b.dataset.type)) {
        b.disabled = false;
      }
    });
    // 자동 기본값: 우선 CFS 선택
    if (availableTypes.includes("CFS")) {
      document.querySelectorAll(".type-btn").forEach((b) => {
        if (b.dataset.type === "CFS") {
          b.click();
        }
      });
    } else if (availableTypes.length > 0) {
      document.querySelectorAll(".type-btn").forEach((b) => {
        if (!b.disabled) {
          b.click();
        }
      });
    }
  });
});

document.querySelectorAll(".type-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    if (this.disabled) return;
    document
      .querySelectorAll(".type-btn")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    selectedType = this.dataset.type;
    // 모든 선택이 완료되면 바로 데이터 로드
    if (selectedYear && selectedQuarter && selectedType) {
      loadChartData();
    }
  });
});

// (5) 데이터 로드 및 차트 렌더링
function loadChartData() {
  const companyInput = document.getElementById("companyInput").value.trim();
  const match = companyInput.match(/\((\d+)\)$/);
  if (!match) {
    alert("올바른 회사를 선택해주세요.");
    return;
  }
  const stockCode = match[1];
  const fileName = `data/${stockCode}_${selectedYear}_${selectedQuarter}_${selectedType}.json`;
  console.log("불러오는 파일:", fileName);
  fetch(fileName)
    .then((res) => {
      if (!res.ok) {
        throw new Error("파일을 불러올 수 없습니다: " + fileName);
      }
      return res.json();
    })
    .then((data) => {
      renderChart(data);
    })
    .catch((err) => {
      console.error("JSON 로드 오류:", err);
    });
}

// (6) Sankey 차트 렌더링 (기존 로직 유지)
function generateSankeyLinks(nodes) {
  const mainChainCodes = [
    "ifrs-full_Revenue",
    "ifrs-full_GrossProfit",
    "dart_OperatingIncomeLoss",
    "ifrs-full_ProfitLossBeforeTax",
    "ifrs-full_ProfitLossFromContinuingOperations",
    "ifrs-full_ProfitLoss",
    "ifrs-full_ComprehensiveIncome",
  ];
  // 메인체인 노드의 인덱스 수집
  let mainChainIndices = [];
  nodes.forEach((node, i) => {
    if (mainChainCodes.includes(node.code)) {
      mainChainIndices.push(i);
    }
  });
  // 값이 0인 메인 노드의 flag는 바로 다음 메인체인 노드의 flag로 설정
  for (let j = 0; j < mainChainIndices.length - 1; j++) {
    const idx = mainChainIndices[j];
    if (nodes[idx].value === 0) {
      nodes[idx].flag = nodes[mainChainIndices[j + 1]].flag;
    }
  }

  let links = [];
  // 각 메인체인 구간에 대해 처리
  for (let i = 0; i < mainChainIndices.length - 1; i++) {
    const leftIndex = mainChainIndices[i];
    const rightIndex = mainChainIndices[i + 1];
    const leftNode = nodes[leftIndex];
    const rightNode = nodes[rightIndex];

    // 메인 노드 사이의 서브 노드들(메인코드가 아닌 노드)
    const subNodes = nodes
      .slice(leftIndex + 1, rightIndex)
      .filter((node) => !mainChainCodes.includes(node.code));

    if (leftNode.flag === rightNode.flag) {
      // 같은 flag인 경우, 메인체인 링크 값은
      // 서브 노드 중에 left와 같은 flag가 있다면 leftNode.value의 절대값,
      // 없으면 rightNode.value의 절대값으로 결정합니다.
      let mainLinkValue;
      if (subNodes.some((sub) => sub.flag === leftNode.flag)) {
        mainLinkValue = Math.abs(leftNode.value);
      } else {
        mainLinkValue = Math.abs(rightNode.value);
      }
      // 메인체인 A -> B 링크를 한 번만 추가
      links.push({
        source: leftNode.name,
        target: rightNode.name,
        value: mainLinkValue,
      });

      // 각 서브 노드에 대해 flag에 따라 연결 결정
      subNodes.forEach((sub) => {
        if (sub.flag === leftNode.flag) {
          // 서브 노드가 메인체인 B(오른쪽)으로 연결되어야 하는 경우:
          // 서브 노드 -> 메인체인B
          links.push({
            source: sub.name,
            target: rightNode.name,
            value: Math.abs(sub.value),
          });
        } else {
          // 서브 노드가 메인체인 A(왼쪽)에서 분기되어 나오는 경우:
          // 메인체인A -> 서브 노드
          links.push({
            source: leftNode.name,
            target: sub.name,
            value: Math.abs(sub.value),
          });
        }
      });
    } else {
      // 메인체인 노드의 flag가 다른 경우는 기존 로직 그대로 처리
      if (subNodes.length > 0) {
        subNodes.forEach((sub) => {
          links.push({
            source: leftNode.name,
            target: sub.name,
            value: Math.abs(leftNode.value),
          });
          links.push({
            source: sub.name,
            target: rightNode.name,
            value: Math.abs(rightNode.value),
          });
        });
      } else {
        links.push({
          source: leftNode.name,
          target: rightNode.name,
          value: Math.abs(rightNode.value),
        });
      }
    }
  }
  return links;
}

function renderChart(data) {
  currentChartData = data;
  // 컨테이너의 실제 너비(픽셀)를 구합니다.
  var container = document.getElementById("main");
  var containerWidth = container.clientWidth;
  // 왼쪽, 오른쪽 5%씩을 제외한 사용 가능한 너비 계산
  var leftMargin = containerWidth * 0.05;
  var effectiveWidth = containerWidth * 0.9;
  const mainChainCodes = [
    "ifrs-full_Revenue",
    "ifrs-full_GrossProfit",
    "dart_OperatingIncomeLoss",
    "ifrs-full_ProfitLossBeforeTax",
    "ifrs-full_ProfitLossFromContinuingOperations",
    "ifrs-full_ProfitLoss",
    "ifrs-full_ComprehensiveIncome",
  ];
  const mainChainIndices = [];
  data.forEach((node, i) => {
    if (mainChainCodes.includes(node.code)) {
      mainChainIndices.push(i);
    }
  });
  const firstMainChainIndex = mainChainIndices[0];
  data.forEach((node, i) => {
    node.itemStyle =
      i === firstMainChainIndex
        ? { color: "gray" }
        : { color: node.flag === "income" ? "green" : "red" };
  });
  const links = generateSankeyLinks(data);
  let diffSubNodes = [];
  for (let i = 0; i < mainChainIndices.length - 1; i++) {
    for (let j = mainChainIndices[i] + 1; j < mainChainIndices[i + 1]; j++) {
      if (data[j].flag !== data[mainChainIndices[i]].flag) {
        diffSubNodes.push({ index: j, node: data[j] });
      }
    }
  }
  const diffIndices = diffSubNodes.map((item) => item.index);
  data = data.filter((_, i) => !diffIndices.includes(i));
  diffSubNodes.sort((a, b) => b.index - a.index);
  diffSubNodes.forEach((item) => {
    data.push(item.node);
  });
  var colorMapping = {};
  data.forEach(function (node) {
    colorMapping[node.name] = node.itemStyle.color;
  });
  links.forEach(function (link) {
    if (useGradient) {
      link.lineStyle = {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: colorMapping[link.source] },
            { offset: 1, color: colorMapping[link.target] },
          ],
          global: false,
        },
      };
    } else {
      link.lineStyle = { color: colorMapping[link.target] };
    }
  });
  console.log(links);
  chart.setOption({
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: function (params) {
        if (params.dataType === "node") {
          return "<b>" + params.name + "</b>: " + params.value.toLocaleString();
        }
        return (
          params.data.source +
          " → " +
          params.data.target +
          ": " +
          params.data.value.toLocaleString()
        );
      },
    },
    series: [
      {
        type: "sankey",
        width: effectiveWidth,
        nodeWidth: 30,
        nodeGap: 15,
        layoutIterations: 0,
        nodeAlign: "right",
        data: data,
        links: links,
        label: {
          position: "inside", // 노드 내부에 표시
          fontSize: 16,
          fontWeight: "bolder",
          textBorderWidth: 4,
          textShadowColor: "rgba(0, 0, 0, 0.5)",
          textShadowBlur: 4,
          textShadowOffsetX: 2,
          textShadowOffsetY: 2,
        },
        emphasis: { focus: "adjacency" },
        lineStyle: { curveness: 0.5 },
      },
    ],
  });
}

window.addEventListener("resize", function () {
  if (currentChartData) {
    renderChart(currentChartData);
    chart.resize();
  }
});
// 페이지 로드 시 CSV 파싱
loadCompanyData();

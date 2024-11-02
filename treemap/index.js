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
                });
            buttonContainer.append(button);
        });
    }).fail(function() {
        alert('JSON 파일을 불러오는 데 실패했습니다. 파일 이름이 올바른지 확인하세요.');
    });
}

function loadData(type, filename) {
    const dom = document.getElementById('chart-container');
    const myChart = echarts.init(dom, null, {
        renderer: 'canvas',
        useDirtyRect: false
    });
    
    myChart.showLoading();
    
    $.get('../data/' + filename, function(kospi_data) {
        myChart.hideLoading();
        const visualMin = -5;
        const visualMax = 5;
        const visualMinBound = -1;
        const visualMaxBound = 1;

        // 검색 입력 필드 생성 및 추가
        const searchInput = $('<input type="text" id="search-input" placeholder="주식을 검색하세요..." />');
        $('#json-button-container').prepend(searchInput); // 버튼 컨테이너에 검색 입력 필드 추가

        // 초기 treemap 그리기
        updateTreemap(kospi_data);

        // 검색 기능
        searchInput.on('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredData = kospi_data.filter(item => item.name.toLowerCase().includes(searchTerm));
            updateTreemap(filteredData);
        });

        function updateTreemap(data) {
            convertData(data);
            myChart.setOption({
                series: [{
                    data: data
                }]
            });
        }

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

        myChart.setOption({
            title: {
                left: 'center',
                subtext: 'test'
            },
            tooltip: {
                formatter: function(info) {
                    let value = info.value;
                    let now_cap = value[0];
                    now_cap = isValidNumber(now_cap) ? echarts.format.addCommas(now_cap) + '원' : '-';
                    let pre_cap = value[1];
                    pre_cap = isValidNumber(pre_cap) ? echarts.format.addCommas(pre_cap) + '원' : '-';
                    let now_price = value[2];
                    now_price = isValidNumber(now_price) ? echarts.format.addCommas(now_price) + '원' : '-';
                    let pre_price = value[3];
                    pre_price = isValidNumber(pre_price) ? echarts.format.addCommas(pre_price) + '원' : '-';
                    let change = value[4];
                    change = isValidNumber(change) ? change.toFixed(2) + '%' : '-';
                    return [
                        '<div class="tooltip-title">' + echarts.format.encodeHTML(info.name) + '</div>',
                        '금일시총: &nbsp;&nbsp;' + now_cap + '<br>',
                        '전일시총: &nbsp;&nbsp;' + pre_cap + '<br>',
                        '금일종가: &nbsp;&nbsp;' + now_price + '<br>',
                        '전일종가: &nbsp;&nbsp;' + pre_price + '<br>',
                        '변동율: &nbsp;&nbsp;' + change
                    ].join('');
                }
            },
            series: [{
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
                labelLayout: function(params) {
                    if (params.rect.width < 5 || params.rect.height < 5) {
                        return { fontSize: 0 };
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
                    color: '#fff',
                    textShadowColor: 'black',
                    textShadowBlur: 4,
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
            }]
        });
    });

    window.addEventListener('resize', myChart.resize);
}

import requests as rq
import pandas as pd
from io import StringIO
from datetime import datetime, timedelta
import json

# OTP 생성을 위한 헤더 정의
otp_headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201' 
}

# 다운로드 요청을 위한 헤더 정의
download_headers = {
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201'
}

# KOSPI 200과 KOSDAQ 150의 파라미터 템플릿
otp_params_template = {
    "locale": "ko_KR",
    "tboxindIdx_finder_equidx0_0": "",
    "indIdx": "",
    "indIdx2": "",
    "codeNmindIdx_finder_equidx0_0": "",
    "param1indIdx_finder_equidx0_0": "",
    "trdDd": "",  # 거래일
    "money": "3",
    "csvxls_isNo": "false",
    "name": "fileDown",
    "url": "dbms/MDC/STAT/standard/MDCSTAT00601"
}

# KOSPI 200과 KOSDAQ 150을 위한 고정값 설정
kospi_params = otp_params_template.copy()
kospi_params.update({
    "tboxindIdx_finder_equidx0_0": "코스피+200",
    "indIdx": "1",
    "indIdx2": "028",
    "codeNmindIdx_finder_equidx0_0": "코스피+200",
})

kosdaq_params = otp_params_template.copy()
kosdaq_params.update({
    "tboxindIdx_finder_equidx0_0": "코스닥+150",
    "indIdx": "2",
    "indIdx2": "203",
    "codeNmindIdx_finder_equidx0_0": "코스닥+150",
})

# OTP 생성을 위한 URL
krx_gen_otp_url = 'http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd'

def get_otp(params):
    response = rq.post(krx_gen_otp_url, params, headers=otp_headers)
    response.raise_for_status()  # 오류 발생 시 예외 처리
    return response.text

# CSV 데이터를 다운로드하는 함수
def download_csv(otp):
    download_url = 'http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd'
    download_params = {
        'code': otp
    }
    response = rq.post(download_url, download_params, headers=download_headers)
    response.raise_for_status()  # 오류 발생 시 예외 처리
    response.encoding = 'euc-kr'  # 인코딩 설정
    csv_data = response.text

    # 종목코드를 문자형으로 변환
    df = pd.read_csv(StringIO(csv_data), dtype={'종목코드': str})  # 종목코드를 문자열로 변환
    return df

# 업종 정보를 가져오는 함수 (KOSPI)
def fetch_kospi_sector_data(trade_date):
    sector_params = {
        "locale": "ko_KR",
        "mktId": "STK",
        "trdDd": trade_date,  # 거래일
        "money": "1",
        "csvxls_isNo": "false",
        "name": "fileDown",
        "url": "dbms/MDC/STAT/standard/MDCSTAT03901"
    }
    
    otp = get_otp(sector_params)
    sector_csv = download_csv(otp)
    return sector_csv[['종목코드', '업종명']]  # 업종명을 포함한 필요한 컬럼 선택

# 업종 정보를 가져오는 함수 (KOSDAQ)
def fetch_kosdaq_sector_data(trade_date):
    sector_params = {
        "locale": "ko_KR",
        "mktId": "KSQ",
        "segTpCd": "ALL",
        "trdDd": trade_date,  # 거래일
        "money": "1",
        "csvxls_isNo": "false",
        "name": "fileDown",
        "url": "dbms/MDC/STAT/standard/MDCSTAT03901"
    }
    
    otp = get_otp(sector_params)
    sector_csv = download_csv(otp)
    return sector_csv[['종목코드', '업종명']]  # 업종명을 포함한 필요한 컬럼 선택

# 오늘 날짜 기준으로 전일 데이터를 가져오기
def fetch_data_for_previous_days(kospi_params, kosdaq_params):
    today = datetime.now()
    
    for days_ago in range(1, 31):  # 최대 30일까지 시도
        trade_date = (today - timedelta(days=days_ago)).strftime('%Y%m%d')  # YYYYMMDD 형식으로 변환
        print(f"KOSPI: Trying date: {trade_date}")
        
        # KOSPI 데이터 요청
        kospi_params['trdDd'] = trade_date
        krx_kospi_otp = get_otp(kospi_params)
        try:
            kospi_data = download_csv(krx_kospi_otp)
            break  # 데이터가 성공적으로 다운로드되면 루프 탈출
        except rq.exceptions.HTTPError as e:
            print(f"KOSPI data not available for {trade_date}: {e}")

    for days_ago in range(1, 31):  # 최대 30일까지 시도
        trade_date = (today - timedelta(days=days_ago)).strftime('%Y%m%d')  # YYYYMMDD 형식으로 변환
        print(f"KOSDAQ: Trying date: {trade_date}")

        # KOSDAQ 데이터 요청
        kosdaq_params['trdDd'] = trade_date
        krx_kosdaq_otp = get_otp(kosdaq_params)
        try:
            kosdaq_data = download_csv(krx_kosdaq_otp)
            break  # 데이터가 성공적으로 다운로드되면 루프 탈출
        except rq.exceptions.HTTPError as e:
            print(f"KOSDAQ data not available for {trade_date}: {e}")

    return kospi_data, kosdaq_data, trade_date  # 거래일 반환

# 오늘 거래일 데이터 가져오기
def fetch_today_data(kospi_params, kosdaq_params):
    today = datetime.now().strftime('%Y%m%d')  # 오늘 날짜 YYYYMMDD 형식
    kospi_params['trdDd'] = today
    krx_kospi_otp = get_otp(kospi_params)
    kosdaq_params['trdDd'] = today
    krx_kosdaq_otp = get_otp(kosdaq_params)

    kospi_today_data = download_csv(krx_kospi_otp)
    kosdaq_today_data = download_csv(krx_kosdaq_otp)

    return kospi_today_data, kosdaq_today_data

# KOSPI와 KOSDAQ의 데이터 가져오기
kospi_data, kosdaq_data, trade_date = fetch_data_for_previous_days(kospi_params, kosdaq_params)

# 오늘자 데이터 가져오기
kospi_today_data, kosdaq_today_data = fetch_today_data(kospi_params, kosdaq_params)

# KOSPI 업종 데이터 가져오기
sector_data_kospi = fetch_kospi_sector_data(trade_date)

# KOSDAQ 업종 데이터 가져오기
sector_data_kosdaq = fetch_kosdaq_sector_data(trade_date)

# 필요한 데이터 선택 (컬럼 순서 수정)
kospi_selected = kospi_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]
kosdaq_selected = kosdaq_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]

# 오늘자 데이터를 선택할 때 필요 컬럼 추가
kospi_today_selected = kospi_today_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]
kosdaq_today_selected = kosdaq_today_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]

# 오늘자 KOSPI와 KOSDAQ 데이터와 전일자 데이터를 합치기
merged_kospi_data = kospi_selected.merge(kospi_today_selected, on='종목코드', how='outer', suffixes=('', '_today'))
merged_kosdaq_data = kosdaq_selected.merge(kosdaq_today_selected, on='종목코드', how='outer', suffixes=('', '_today'))

# 업종 정보 병합
merged_kospi_data = merged_kospi_data.merge(sector_data_kospi, on='종목코드', how='left')
merged_kosdaq_data = merged_kosdaq_data.merge(sector_data_kosdaq, on='종목코드', how='left')

# NaN 값 처리
merged_kospi_data['업종명'] = merged_kospi_data['업종명'].fillna('기타')
merged_kosdaq_data['업종명'] = merged_kosdaq_data['업종명'].fillna('기타')

# JSON 형태로 변환할 데이터 구조 만들기
def create_json_structure(merged_data, sector_data):
    result = []
    sector_grouped = merged_data.groupby('업종명')

    for sector_name, group in sector_grouped:
        sector_info = {
            "name": sector_name,
            "id": sector_name,
            "discretion": "mandatory",
            "value": group['상장시가총액'].sum(),
            "children": []
        }
        
        for _, row in group.iterrows():
            stock_info = {
                "name": row['종목명'],
                "id": row['종목코드'],
                "discretion": "mandatory",
                "value": [
                    row['상장시가총액'],
                    row['상장시가총액_today'],  # 오늘 시가총액
                    row['종가'],
                    row['종가_today'],  # 오늘 종가
                    row['등락률_today']  # 오늘 변동률
                ]
            }
            sector_info["children"].append(stock_info)
        
        result.append(sector_info)

    return result

# KOSPI 및 KOSDAQ 데이터 JSON 구조 생성
kospi_json_structure = create_json_structure(merged_kospi_data, sector_data_kospi)
kosdaq_json_structure = create_json_structure(merged_kosdaq_data, sector_data_kosdaq)

# JSON 파일 저장
now = datetime.now().strftime('%Y%m%d%H%M')
with open(f'kospi_map_data_{now}.json', 'w', encoding='utf-8') as kospi_file:
    json.dump(kospi_json_structure, kospi_file, ensure_ascii=False, indent=4)

with open(f'kosdaq_map_data_{now}.json', 'w', encoding='utf-8') as kosdaq_file:
    json.dump(kosdaq_json_structure, kosdaq_file, ensure_ascii=False, indent=4)

print("JSON 파일이 저장되었습니다.")

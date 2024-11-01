import requests as rq
import pandas as pd
from io import StringIO
from datetime import datetime, timedelta

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
    return response.text

# 오늘 날짜 기준으로 전일 데이터를 가져오기
def fetch_data_for_previous_days(kospi_params, kosdaq_params):
    today = datetime.now()
    # 현재 날짜에서 하루씩 빼면서 데이터 요청
    for days_ago in range(1, 31):  # 최대 30일까지 시도
        trade_date = (today - timedelta(days=days_ago)).strftime('%Y%m%d')  # YYYYMMDD 형식으로 변환
        print(f"KOSPI: Trying date: {trade_date}")
        
        # KOSPI 데이터 요청
        kospi_params['trdDd'] = trade_date
        krx_kospi_otp = get_otp(kospi_params)
        try:
            kospi_csv = download_csv(krx_kospi_otp)
            kospi_data = pd.read_csv(StringIO(kospi_csv))
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
            kosdaq_csv = download_csv(krx_kosdaq_otp)
            kosdaq_data = pd.read_csv(StringIO(kosdaq_csv))
            break  # 데이터가 성공적으로 다운로드되면 루프 탈출
        except rq.exceptions.HTTPError as e:
            print(f"KOSDAQ data not available for {trade_date}: {e}")

    return kospi_data, kosdaq_data

# KOSPI와 KOSDAQ의 데이터 가져오기
kospi_data, kosdaq_data = fetch_data_for_previous_days(kospi_params, kosdaq_params)

# 필요한 데이터 선택 (컬럼 순서 수정)
kospi_selected = kospi_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]
kosdaq_selected = kosdaq_data[['종목코드', '종목명', '종가', '대비', '등락률', '상장시가총액']]

# CSV 파일로 저장
kospi_selected.to_csv('kospi_data.csv', index=False, encoding='utf-8-sig')  # UTF-8 with BOM for Korean characters
kosdaq_selected.to_csv('kosdaq_data.csv', index=False, encoding='utf-8-sig')

# 결과 출력
print("KOSPI 200 데이터가 'kospi_data.csv' 파일에 저장되었습니다.")
print("KOSDAQ 150 데이터가 'kosdaq_data.csv' 파일에 저장되었습니다.")

# CCTV CSV 파일 위치

공공데이터포털에서 받은 CCTV CSV 파일을 이 폴더에 `cctv.csv` 또는 `cctv.csv.gz` 이름으로 넣으면 됩니다.

필요한 파일명:

```text
public/data/cctv.csv
```

GitHub 웹 업로드에서 25MB 제한이 걸리면 gzip으로 압축한 파일을 사용하세요.

```text
public/data/cctv.csv.gz
```

Vercel 서버에서 공공데이터 원본 URL을 직접 호출하면 403으로 막힐 수 있어서,
운영 사이트에서는 CSV 파일을 프로젝트에 포함하는 방식이 더 안정적입니다.

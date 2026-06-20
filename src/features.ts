export type Feature = {
  path: string;
  label: string;
  description: string;
};

export const features: Feature[] = [
  {
    path: "/delivery",
    label: "납품서 요약",
    description:
      "날짜별 납품서 폴더를 드래그해 납품처별로 자동 집계하고 다운로드합니다.",
  },
  {
    path: "/incoming",
    label: "입고 현황",
    description:
      "입출고리스트 파일을 올리면 품목별로 날짜 누락 여부를 한눈에 확인합니다.",
  },
];

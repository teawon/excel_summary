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
];

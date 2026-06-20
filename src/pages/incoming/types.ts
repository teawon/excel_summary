export type ParseError = {
  id: string;
  fileName: string;
  message: string;
};

export type IncomingRecord = {
  id: string;
  sourceFile: string;
  date: string;
  itemName: string;
  issue: string;
  volNo: string;
  quantity: number;
  subscriberQty: number;
  remark: string;
};

export type IncomingFile = {
  id: string;
  fileName: string;
  date: string;
  records: IncomingRecord[];
};

export type IncomingItemGroup = {
  id: string;
  itemName: string;
  records: IncomingRecord[];
  presentDates: string[];
  missingDates: string[];
  totalQuantity: number;
};

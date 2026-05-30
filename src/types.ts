export type ParseError = {
  id: string;
  fileName: string;
  message: string;
};

export type UploadFile = {
  file: File;
  relativePath: string;
};

export type DeliveryItem = {
  id: string;
  sourceFile: string;
  sourcePath: string;
  destinationName: string;
  deliveryDate: string;
  sequence: string;
  publicationName: string;
  publicationType: string;
  issueDate: string;
  volumeNo: string;
  quantity: number;
  note: string;
};

export type DeliveryDocument = {
  id: string;
  fileName: string;
  relativePath: string;
  destinationName: string;
  destinationRaw: string;
  deliveryDate: string;
  items: DeliveryItem[];
};

export type DeliveryGroup = {
  id: string;
  destinationName: string;
  documents: DeliveryDocument[];
  items: DeliveryItem[];
  totalQuantity: number;
  dateRange: string;
};

export type PublicationGroup = {
  id: string;
  publicationName: string;
  items: DeliveryItem[];
  totalQuantity: number;
  dateRange: string;
};

export type QuarterGroup = {
  id: string;
  label: string;
  documents: DeliveryDocument[];
  items: DeliveryItem[];
  totalQuantity: number;
  dateRange: string;
};
